/**
 * Stripe connector.
 *
 * Auth strategy: api_key (secret key stored encrypted)
 * Capabilities:  invoices, contacts, payments
 *
 * Webhook topics handled:
 *   payment_intent.succeeded
 *   invoice.payment_succeeded
 *   invoice.finalized
 *   customer.created / customer.updated
 */

import { createHmac, timingSafeEqual } from "crypto"
import type { Connector, WebhookVerification, MappedContact, MappedInvoice, MappedPayment } from "../types"

// ─── Signature verification ───────────────────────────────────────────────────

function verifyWebhook(
  rawBody: Buffer,
  headers: Record<string, string>,
  secret:  string,
): WebhookVerification {
  const sig = headers["stripe-signature"] ?? ""
  const parts = Object.fromEntries(sig.split(",").map((p) => p.split("=")))
  const timestamp = parts["t"]
  const v1        = parts["v1"]

  if (!timestamp || !v1) {
    return { valid: false, topic: "", eventId: "", payload: null }
  }

  const signed = `${timestamp}.${rawBody.toString("utf8")}`
  const expected = createHmac("sha256", secret).update(signed).digest("hex")

  const valid = timingSafeEqual(
    Buffer.from(v1,       "hex"),
    Buffer.from(expected, "hex"),
  )

  if (!valid) return { valid: false, topic: "", eventId: "", payload: null }

  const event = JSON.parse(rawBody.toString("utf8"))
  return {
    valid:   true,
    topic:   event.type    as string,
    eventId: event.id      as string,
    payload: event,
  }
}

// ─── Entity mappers ───────────────────────────────────────────────────────────

function mapCustomer(customer: Record<string, unknown>): MappedContact {
  return {
    externalId:  customer.id      as string,
    name:        (customer.name as string) || (customer.email as string) || "Unknown",
    email:       customer.email   as string | null,
    phone:       customer.phone   as string | null,
  }
}

function mapStripeInvoice(inv: Record<string, unknown>): MappedInvoice {
  const lines = ((inv.lines as { data: unknown[] })?.data ?? []) as Record<string, unknown>[]

  return {
    externalId:          inv.id       as string,
    externalNumber:      (inv.number  as string) ?? (inv.id as string),
    contactExternalId:   inv.customer as string | null,
    issueDate:           new Date((inv.created as number) * 1000),
    dueDate:             inv.due_date
                           ? new Date((inv.due_date as number) * 1000)
                           : new Date((inv.created as number) * 1000 + 30 * 86400_000),
    currency:            ((inv.currency as string) ?? "sek").toUpperCase(),
    totalAmount:         inv.total as number,  // Stripe already uses cents/öre
    status:              stripeInvoiceStatus(inv.status as string),
    lineItems: lines.map((l) => ({
      description: (l.description as string) ?? "",
      quantity:    (l.quantity    as number) ?? 1,
      unitPrice:   (l.amount      as number) ?? 0,
      vatRate:     0,  // Stripe doesn't natively carry VAT — enriched separately
    })),
  }
}

function stripeInvoiceStatus(s: string): MappedInvoice["status"] {
  switch (s) {
    case "draft":  return "draft"
    case "open":   return "sent"
    case "paid":   return "paid"
    case "void":   return "void"
    default:       return "sent"
  }
}

function mapPaymentIntent(pi: Record<string, unknown>): MappedPayment {
  return {
    externalId:        pi.id     as string,
    invoiceExternalId: (pi.invoice as string) ?? "",
    amount:            pi.amount  as number,
    currency:          ((pi.currency as string) ?? "sek").toUpperCase(),
    paidAt:            new Date((pi.created as number) * 1000),
    method:            "stripe",
  }
}

// ─── Webhook topic → entities ─────────────────────────────────────────────────

function mapWebhookToEntities(topic: string, payload: unknown) {
  const event = payload as { data: { object: Record<string, unknown> } }
  const obj   = event?.data?.object

  switch (topic) {
    case "customer.created":
    case "customer.updated":
      return { contacts: [mapCustomer(obj)] }

    case "invoice.finalized":
    case "invoice.payment_succeeded":
      return { invoices: [mapStripeInvoice(obj)] }

    case "payment_intent.succeeded":
      if (!obj.invoice) return null  // no linked invoice, skip
      return { payments: [mapPaymentIntent(obj)] }

    default:
      return null
  }
}

// ─── Sync (pull) ──────────────────────────────────────────────────────────────

async function* sync(opts: {
  apiKey?:      string | null
  accessToken?: string | null
  cursor?:      string | null
  fromDate?:    Date
}) {
  const key = opts.apiKey ?? opts.accessToken
  if (!key) throw new Error("Stripe connector requires an API key")

  const baseUrl = "https://api.stripe.com/v1"
  const headers = { Authorization: `Bearer ${key}` }

  // Pull customers
  let customerCursor: string | null = null
  do {
    const params = new URLSearchParams({ limit: "100" })
    if (customerCursor) params.set("starting_after", customerCursor)
    if (opts.fromDate)  params.set("created[gte]", String(Math.floor(opts.fromDate.getTime() / 1000)))

    const res  = await fetch(`${baseUrl}/customers?${params}`, { headers })
    const data = await res.json() as { data: Record<string, unknown>[]; has_more: boolean }

    const contacts = data.data.map(mapCustomer)
    customerCursor = data.has_more ? (data.data.at(-1)?.id as string) : null

    yield { contacts, nextCursor: customerCursor }
  } while (customerCursor)

  // Pull invoices
  let invCursor: string | null = opts.cursor ?? null
  do {
    const params = new URLSearchParams({ limit: "100", expand: "data.lines" })
    if (invCursor)     params.set("starting_after", invCursor)
    if (opts.fromDate) params.set("created[gte]", String(Math.floor(opts.fromDate.getTime() / 1000)))

    const res  = await fetch(`${baseUrl}/invoices?${params}`, { headers })
    const data = await res.json() as { data: Record<string, unknown>[]; has_more: boolean }

    const invoices = data.data.map(mapStripeInvoice)
    invCursor = data.has_more ? (data.data.at(-1)?.id as string) : null

    yield { invoices, nextCursor: invCursor }
  } while (invCursor)
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const stripeConnector: Connector = {
  config: {
    displayName:   "Stripe",
    slug:          "stripe",
    authStrategy:  "api_key",
    capabilities:  ["invoices", "contacts", "payments"],
    webhookTopics: [
      "customer.created",
      "customer.updated",
      "invoice.finalized",
      "invoice.payment_succeeded",
      "payment_intent.succeeded",
    ],
  },
  verifyWebhook,
  mapWebhookToEntities,
  sync,
}
