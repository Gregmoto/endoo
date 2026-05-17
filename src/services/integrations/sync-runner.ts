/**
 * Sync runner — pull-based sync for connectors that support it.
 *
 * Creates a SyncJob, calls connector.sync() as an async generator,
 * persists each batch, and updates the cursor so restarts are resumable.
 * Overlap window: from = lastSyncAt − 2h to catch events that arrived late.
 */

import { prisma }               from "@/lib/prisma"
import { getConnector }         from "@/lib/integrations/registry"
import { getDecryptedCredentials, markError } from "./connection"
import { upsertMap }            from "@/lib/integrations/entity-map"
import { validateContact, validateInvoice, validatePayment } from "@/lib/integrations/validator"

const OVERLAP_MS = 2 * 3600_000  // 2-hour overlap window

// ─── runSync ─────────────────────────────────────────────────────────────────

export async function runSync(connectionId: string): Promise<void> {
  const connection = await prisma.connection.findUnique({
    where:  { id: connectionId },
  })
  if (!connection || connection.status !== "active") return

  const connector = getConnector(connection.integrationSlug)
  if (!connector.sync) return  // connector doesn't support pull sync

  // Create SyncJob
  const job = await prisma.syncJob.create({
    data: {
      connectionId,
      organizationId: connection.organizationId,
      jobType:        "full",
      status:         "running",
      cursor:         connection.lastSyncCursor,
      startedAt:      new Date(),
      triggeredBy:    "cron",
    },
  })

  const fromDate = connection.lastSyncAt
    ? new Date(connection.lastSyncAt.getTime() - OVERLAP_MS)
    : undefined

  const creds = getDecryptedCredentials(connection)

  let itemsOk = 0
  let lastCursor:  string | null = connection.lastSyncCursor

  try {
    const gen = connector.sync({
      apiKey:      creds.apiKey,
      accessToken: creds.accessToken,
      cursor:      connection.lastSyncCursor,
      fromDate,
    })

    for await (const batch of gen) {
      await processBatch(connection.id, connection.organizationId, batch)

      const batchCount =
        (batch.contacts?.length  ?? 0) +
        (batch.invoices?.length  ?? 0) +
        (batch.payments?.length  ?? 0)
      itemsOk += batchCount
      lastCursor     = batch.nextCursor

      // Persist cursor after each batch so restarts resume correctly
      await prisma.syncJob.update({
        where: { id: job.id },
        data:  { cursor: lastCursor, itemsOk },
      })
      await prisma.connection.update({
        where: { id: connectionId },
        data:  { lastSyncCursor: lastCursor },
      })
    }

    // Success
    await prisma.syncJob.update({
      where: { id: job.id },
      data:  { status: "completed", completedAt: new Date(), itemsOk },
    })
    await prisma.connection.update({
      where: { id: connectionId },
      data:  {
        lastSyncAt:    new Date(),
        lastSyncCursor: null,  // reset cursor for next full sync
        errorCount:    0,
        lastErrorAt:   null,
        lastErrorMessage: null,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await prisma.syncJob.update({
      where: { id: job.id },
      data:  { status: "failed", completedAt: new Date(), errorMessage: msg, itemsOk },
    })
    await markError(connectionId, err)
  }
}

// ─── processBatch ─────────────────────────────────────────────────────────────

async function processBatch(
  connectionId:   string,
  organizationId: string,
  batch: { contacts?: unknown[]; invoices?: unknown[]; payments?: unknown[] },
): Promise<void> {
  // Contacts
  for (const raw of batch.contacts ?? []) {
    const v = validateContact(raw)
    if (!v.ok) continue
    const c = v.data

    const existing = await prisma.externalEntityMap.findUnique({
      where: {
        connectionId_externalType_externalId: {
          connectionId, externalType: "contact", externalId: c.externalId,
        },
      },
    })

    let contactId: string
    if (existing) {
      await prisma.contact.update({ where: { id: existing.internalId }, data: { name: c.name, email: c.email, phone: c.phone } })
      contactId = existing.internalId
    } else {
      const created = await prisma.contact.create({
        data: { organizationId, name: c.name, email: c.email, phone: c.phone, orgNumber: c.orgNumber },
      })
      contactId = created.id
    }

    await upsertMap({ connectionId, organizationId, externalType: "contact", externalId: c.externalId, internalId: contactId, payload: c })
  }

  // Invoices
  for (const raw of batch.invoices ?? []) {
    const v = validateInvoice(raw)
    if (!v.ok) continue
    const inv = v.data

    const existing = await prisma.externalEntityMap.findUnique({
      where: {
        connectionId_externalType_externalId: {
          connectionId, externalType: "invoice", externalId: inv.externalId,
        },
      },
    })

    // Resolve contactId from map
    let contactId: string | null = null
    if (inv.contactExternalId) {
      const cm = await prisma.externalEntityMap.findUnique({
        where: {
          connectionId_externalType_externalId: {
            connectionId, externalType: "contact", externalId: inv.contactExternalId,
          },
        },
      })
      contactId = cm?.internalId ?? null
    }

    let invoiceId: string
    if (existing) {
      const { changed } = await upsertMap({ connectionId, organizationId, externalType: "invoice", externalId: inv.externalId, internalId: existing.internalId, payload: inv })
      if (changed) {
        await prisma.invoice.update({
          where: { id: existing.internalId },
          data:  { status: inv.status, totalAmount: BigInt(inv.totalAmount) },
        })
      }
      invoiceId = existing.internalId
    } else {
      const created = await prisma.invoice.create({
        data: {
          organizationId,
          contactId:     contactId ?? undefined,
          invoiceNumber: inv.externalNumber,
          status:        inv.status,
          issueDate:     inv.issueDate,
          dueDate:       inv.dueDate,
          currency:      inv.currency,
          totalAmount:    BigInt(inv.totalAmount),
          subtotalAmount: BigInt(inv.totalAmount),
          taxAmount:      0n,
        },
      })
      invoiceId = created.id
      await upsertMap({ connectionId, organizationId, externalType: "invoice", externalId: inv.externalId, internalId: invoiceId, payload: inv })
    }
    void invoiceId
  }

  // Payments
  for (const raw of batch.payments ?? []) {
    const v = validatePayment(raw)
    if (!v.ok) continue
    const pay = v.data

    const existing = await prisma.externalEntityMap.findUnique({
      where: {
        connectionId_externalType_externalId: {
          connectionId, externalType: "payment", externalId: pay.externalId,
        },
      },
    })
    if (existing) continue  // already imported

    const invMap = await prisma.externalEntityMap.findUnique({
      where: {
        connectionId_externalType_externalId: {
          connectionId, externalType: "invoice", externalId: pay.invoiceExternalId,
        },
      },
    })
    if (!invMap) continue  // invoice not yet synced

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        invoiceId: invMap.internalId,
        amount:    BigInt(pay.amount),
        currency:  pay.currency,
        paymentDate: pay.paidAt,
        method:    "other",
      },
    })

    await upsertMap({ connectionId, organizationId, externalType: "payment", externalId: pay.externalId, internalId: payment.id, payload: pay })
  }
}

// ─── runDueConnections ────────────────────────────────────────────────────────

/** Triggered by the cron — syncs all connections whose interval is due. */
export async function runDueConnections(): Promise<number> {
  const now = new Date()

  const connections = await prisma.connection.findMany({
    where: {
      status: "active",
      OR: [
        { lastSyncAt: null },
        { lastSyncAt: { lt: new Date(now.getTime() - 60_000) } },
      ],
    },
    select: { id: true, lastSyncAt: true, syncIntervalMin: true },
  })

  const due = connections.filter((c) => {
    if (!c.syncIntervalMin) return false
    if (!c.lastSyncAt) return true
    const nextSync = new Date(c.lastSyncAt.getTime() + c.syncIntervalMin * 60_000)
    return nextSync <= now
  })

  await Promise.allSettled(due.map((c) => runSync(c.id)))
  return due.length
}
