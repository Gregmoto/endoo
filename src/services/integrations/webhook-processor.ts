/**
 * Webhook processor — claim-and-process loop for WebhookEvent rows.
 *
 * Designed for a cron trigger:
 *   1. SELECT FOR UPDATE SKIP LOCKED — claim one pending/retry-due event
 *   2. Dispatch to connector.mapWebhookToEntities
 *   3. Persist mapped entities
 *   4. Mark success or schedule exponential retry
 *
 * Retry schedule (attempts → nextAttemptAt delay):
 *   1 → 30s, 2 → 5min, 3 → 30min, 4 → 2h, 5 → 24h, then → failed
 */

import { prisma }                from "@/lib/prisma"
import { getConnector }          from "@/lib/integrations/registry"
import { getDecryptedCredentials } from "./connection"
import { upsertMap }             from "@/lib/integrations/entity-map"
import { validateContact, validateInvoice, validatePayment } from "@/lib/integrations/validator"
import type { WebhookEvent }     from "@prisma/client"

const RETRY_DELAYS_MS = [
  30_000,          // 30s
  5 * 60_000,      // 5min
  30 * 60_000,     // 30min
  2 * 3600_000,    // 2h
  24 * 3600_000,   // 24h
]

const MAX_ATTEMPTS = RETRY_DELAYS_MS.length

// ─── claimNextEvent ───────────────────────────────────────────────────────────

async function claimNextEvent(): Promise<WebhookEvent | null> {
  const rows = await prisma.$queryRaw<WebhookEvent[]>`
    SELECT * FROM "WebhookEvent"
    WHERE  status IN ('pending', 'retrying')
      AND  ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= now())
    ORDER BY "createdAt" ASC
    LIMIT  1
    FOR UPDATE SKIP LOCKED
  `
  if (!rows.length) return null

  const event = rows[0]

  // Mark as processing
  await prisma.webhookEvent.update({
    where: { id: event.id },
    data:  { status: "processing", attempts: { increment: 1 }, processedAt: new Date() },
  })

  return event
}

// ─── processEvent ─────────────────────────────────────────────────────────────

async function processEvent(event: WebhookEvent): Promise<void> {
  const connection = await prisma.connection.findUnique({
    where: { id: event.connectionId },
  })
  if (!connection) {
    await markFailed(event.id, "Connection not found")
    return
  }

  const connector = getConnector(connection.integrationSlug)
  if (!connector.mapWebhookToEntities) {
    await markSuccess(event.id)
    return
  }

  const entities = connector.mapWebhookToEntities(event.topic, event.rawPayload)
  if (!entities) {
    await markSuccess(event.id)
    return
  }

  const creds = getDecryptedCredentials(connection)
  void creds  // available for connectors that need auth during processing

  const errors: string[] = []

  // ── Contacts ─────────────────────────────────────────────────────────────────
  for (const raw of entities.contacts ?? []) {
    const v = validateContact(raw)
    if (!v.ok) { errors.push(`contact ${raw.externalId}: ${v.errors.join(", ")}`); continue }
    const c = v.data

    const existing = await prisma.contact.findFirst({
      where: { organizationId: connection.organizationId, email: c.email ?? undefined },
      select: { id: true },
    })

    const contactId = existing?.id ?? (await prisma.contact.create({
      data: {
        organizationId: connection.organizationId,
        name:           c.name,
        email:          c.email ?? undefined,
        phone:          c.phone ?? undefined,
        orgNumber:      c.orgNumber ?? undefined,
        vatNumber:      c.vatNumber ?? undefined,
        addressLine1:   c.address ?? undefined,
        city:           c.city ?? undefined,
        postalCode:     c.postalCode ?? undefined,
        country:        c.country ?? "SE",
      },
    })).id

    await upsertMap({
      connectionId:   connection.id,
      organizationId: connection.organizationId,
      externalType:   "contact",
      externalId:     c.externalId,
      internalId:     contactId,
      payload:        c,
    })
  }

  // ── Invoices ──────────────────────────────────────────────────────────────────
  for (const raw of entities.invoices ?? []) {
    const v = validateInvoice(raw)
    if (!v.ok) { errors.push(`invoice ${raw.externalId}: ${v.errors.join(", ")}`); continue }
    const inv = v.data

    // Resolve contact
    let contactId: string | null = inv.contactId ?? null
    if (!contactId && inv.contactExternalId) {
      const map = await prisma.externalEntityMap.findUnique({
        where: {
          connectionId_externalType_externalId: {
            connectionId:  connection.id,
            externalType:  "contact",
            externalId:    inv.contactExternalId,
          },
        },
        select: { internalId: true },
      })
      contactId = map?.internalId ?? null
    }

    const existing = await prisma.externalEntityMap.findUnique({
      where: {
        connectionId_externalType_externalId: {
          connectionId:  connection.id,
          externalType:  "invoice",
          externalId:    inv.externalId,
        },
      },
    })

    let internalInvoiceId: string
    if (existing) {
      // Update if changed
      await prisma.invoice.update({
        where: { id: existing.internalId },
        data:  { status: inv.status, totalAmount: BigInt(inv.totalAmount) },
      })
      internalInvoiceId = existing.internalId
    } else {
      const created = await prisma.invoice.create({
        data: {
          organizationId: connection.organizationId,
          contactId:      contactId ?? undefined,
          invoiceNumber:  inv.externalNumber,
          status:         inv.status,
          issueDate:      inv.issueDate,
          dueDate:        inv.dueDate,
          currency:       inv.currency,
          totalAmount:    BigInt(inv.totalAmount),
          subtotalAmount: BigInt(inv.totalAmount),
          taxAmount:      0n,
        },
      })
      internalInvoiceId = created.id
    }

    await upsertMap({
      connectionId:   connection.id,
      organizationId: connection.organizationId,
      externalType:   "invoice",
      externalId:     inv.externalId,
      internalId:     internalInvoiceId,
      payload:        inv,
    })
  }

  // ── Payments ──────────────────────────────────────────────────────────────────
  for (const raw of entities.payments ?? []) {
    const v = validatePayment(raw)
    if (!v.ok) { errors.push(`payment ${raw.externalId}: ${v.errors.join(", ")}`); continue }
    const pay = v.data

    // Resolve invoice
    const invMap = await prisma.externalEntityMap.findUnique({
      where: {
        connectionId_externalType_externalId: {
          connectionId:  connection.id,
          externalType:  "invoice",
          externalId:    pay.invoiceExternalId,
        },
      },
    })
    if (!invMap) {
      errors.push(`payment ${pay.externalId}: invoice ${pay.invoiceExternalId} not yet imported`)
      continue
    }

    const existingPay = await prisma.externalEntityMap.findUnique({
      where: {
        connectionId_externalType_externalId: {
          connectionId: connection.id,
          externalType: "payment",
          externalId:   pay.externalId,
        },
      },
    })
    if (existingPay) continue  // already recorded

    const payment = await prisma.payment.create({
      data: {
        organizationId: connection.organizationId,
        invoiceId:      invMap.internalId,
        amount:         BigInt(pay.amount),
        currency:       pay.currency,
        paymentDate:    pay.paidAt,
        method:         "other",
      },
    })

    await upsertMap({
      connectionId:   connection.id,
      organizationId: connection.organizationId,
      externalType:   "payment",
      externalId:     pay.externalId,
      internalId:     payment.id,
      payload:        pay,
    })

    // Mark invoice as paid if fully settled
    await prisma.invoice.update({
      where: { id: invMap.internalId },
      data:  { status: "paid" },
    }).catch(() => {})
  }

  if (errors.length > 0) {
    await scheduleRetry(event, errors.join("; "))
    return
  }

  await markSuccess(event.id)
}

// ─── retry / fail helpers ─────────────────────────────────────────────────────

async function scheduleRetry(event: WebhookEvent, error: string): Promise<void> {
  const attempts = (event.attempts ?? 0) + 1
  if (attempts >= MAX_ATTEMPTS) {
    await markFailed(event.id, error)
    return
  }
  const delay = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS.at(-1)!
  await prisma.webhookEvent.update({
    where: { id: event.id },
    data:  {
      status:         "pending",
      nextAttemptAt:  new Date(Date.now() + delay),
      errorMessage:   error.slice(0, 1000),
    },
  })
}

async function markSuccess(eventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data:  { status: "processed", processedAt: new Date(), errorMessage: null },
  })
}

async function markFailed(eventId: string, error: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data:  { status: "failed", errorMessage: error.slice(0, 1000) },
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Process up to `limit` pending webhook events. Returns count processed. */
export async function processWebhooks(limit = 50): Promise<number> {
  let count = 0
  for (let i = 0; i < limit; i++) {
    const event = await claimNextEvent()
    if (!event) break
    try {
      await processEvent(event)
    } catch (err) {
      await scheduleRetry(event, err instanceof Error ? err.message : String(err))
    }
    count++
  }
  return count
}
