/**
 * Supplier invoice booking service
 *
 * bookSupplierInvoice:
 *   Creates and posts the AP journal (DR expense + DR VAT / CR 2440 Leverantörsskulder).
 *   Idempotency: bookingIdempotencyKey is set atomically before journal creation.
 *   A second call with the same invoiceId returns the already-booked data.
 *
 * paySupplierInvoice:
 *   Creates and posts the payment journal (DR 2440 / CR bank account).
 *   Idempotency: paymentIdempotencyKey guards against double payment journals.
 */

import { prisma }          from "@/lib/prisma"
import { createJournal, postJournal } from "@/lib/accounting/journals"
import { getAccountByNumber, getVatCode } from "@/lib/accounting/accounts"
import { randomUUID }      from "crypto"
import type { PaymentMethod } from "@prisma/client"

// ─── Error types ──────────────────────────────────────────────────────────────

export class SupplierInvoiceNotFoundError extends Error {
  constructor(id: string) { super(`Supplier invoice not found: ${id}`) }
}

export class SupplierInvoiceAlreadyBookedError extends Error {
  constructor() { super("Supplier invoice is already booked") }
}

export class SupplierInvoiceAlreadyPaidError extends Error {
  constructor() { super("Supplier invoice is already paid") }
}

export class SupplierInvoiceNotApprovedError extends Error {
  constructor(status: string) { super(`Cannot book invoice with status: ${status}`) }
}

export class SupplierInvoiceNotBookedError extends Error {
  constructor() { super("Invoice must be booked before it can be marked as paid") }
}

export class MissingFieldsError extends Error {
  constructor(fields: string[]) { super(`Missing required fields: ${fields.join(", ")}`) }
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export type BookingInput = {
  organizationId:       string
  invoiceId:            string
  bookedByUserId:       string
  expenseAccountNumber: string   // e.g. "6420" — user selected in UI
  vatAccountNumber?:    string   // e.g. "2640" (ingående moms) — auto or user overrides
  apAccountNumber?:     string   // default: "2440" (leverantörsskulder)
}

export async function bookSupplierInvoice(input: BookingInput) {
  const {
    organizationId,
    invoiceId,
    bookedByUserId,
    expenseAccountNumber,
    vatAccountNumber  = "2640",
    apAccountNumber   = "2440",
  } = input

  // ── Idempotency: claim this booking atomically ────────────────────────────
  const idempotencyKey = randomUUID()
  const claimed = await prisma.supplierInvoice.updateMany({
    where: {
      id:                    invoiceId,
      organizationId,
      bookingIdempotencyKey: null,
      status:                { in: ["approved", "needs_review"] },
    },
    data: { bookingIdempotencyKey: idempotencyKey },
  })

  if (claimed.count === 0) {
    const existing = await prisma.supplierInvoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, journalId: true },
    })
    if (existing?.status === "booked") throw new SupplierInvoiceAlreadyBookedError()
    throw new Error("booking_in_progress: another booking is already running")
  }

  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id: invoiceId, organizationId },
  })
  if (!invoice) throw new SupplierInvoiceNotFoundError(invoiceId)

  // Validate required fields
  const missing: string[] = []
  if (!invoice.amountInclVat) missing.push("amountInclVat")
  if (!invoice.invoiceDate)   missing.push("invoiceDate")
  if (missing.length > 0)     throw new MissingFieldsError(missing)

  // Resolve accounts
  const expenseAccount = await getAccountByNumber(organizationId, expenseAccountNumber)
  if (!expenseAccount) throw new MissingFieldsError([`account ${expenseAccountNumber}`])

  const amountInclVat = invoice.amountInclVat!
  const vatAmount     = invoice.vatAmount     ?? 0n
  const amountExclVat = invoice.amountExclVat ?? (amountInclVat - vatAmount)

  // Build journal entries
  // DR expense account  (cost ex VAT)
  // DR 2640 ingående moms (VAT, if > 0)
  // CR 2440 leverantörsskulder (total incl VAT)
  type EntryInput = { accountId: string; debit: bigint; credit: bigint; description?: string; vatCode?: string }
  const entries: EntryInput[] = []

  // Resolve account IDs
  const expAcct = expenseAccount
  const apAcct  = await getAccountByNumber(organizationId, apAccountNumber)
  if (!apAcct) throw new MissingFieldsError([`account ${apAccountNumber}`])

  entries.push({
    accountId:   expAcct.id,
    debit:       amountExclVat,
    credit:      0n,
    description: `Lev.fakt ${invoice.invoiceNumber ?? ""} — ${invoice.supplierName ?? ""}`,
  })

  if (vatAmount > 0n) {
    const vatAcct = await getAccountByNumber(organizationId, vatAccountNumber)
    if (!vatAcct) throw new MissingFieldsError([`account ${vatAccountNumber}`])
    const vatCode = invoice.vatRate ? getVatCode(Number(invoice.vatRate)) : "MP1"
    entries.push({
      accountId:   vatAcct.id,
      debit:       vatAmount,
      credit:      0n,
      vatCode,
      description: "Ingående moms",
    })
  }

  entries.push({
    accountId:   apAcct.id,
    debit:       0n,
    credit:      amountInclVat,
    description: `Lev.fakt ${invoice.invoiceNumber ?? ""} — ${invoice.supplierName ?? ""}`,
  })

  // Create + post journal
  const journal = await createJournal({
    organizationId,
    seriesPrefix:    "L",
    date:            invoice.invoiceDate!.toISOString().slice(0, 10),
    description:     `Lev.fakt ${invoice.invoiceNumber ?? ""} — ${invoice.supplierName ?? ""}`,
    sourceType:      "supplier_invoice",
    sourceId:        invoiceId,
    createdByUserId: bookedByUserId,
    entries,
  })

  await postJournal(organizationId, journal.id, bookedByUserId)

  // Update invoice status
  const updated = await prisma.supplierInvoice.update({
    where: { id: invoiceId },
    data:  {
      status:        "booked",
      journalId:     journal.id,
      bookedAt:      new Date(),
      bookedByUserId,
    },
  })

  // Audit log (fire-and-forget)
  prisma.auditLog.create({
    data: {
      organizationId,
      userId:     bookedByUserId,
      action:     "update",
      entityType: "SupplierInvoice",
      entityId:   invoiceId,
      meta:       { event: "booked", journalId: journal.id, reference: journal.reference },
    },
  }).catch(() => {})

  return { invoice: updated, journal }
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentInput = {
  organizationId:    string
  invoiceId:         string
  paidByUserId:      string
  paidAt:            Date
  paidAmount:        bigint
  paymentMethod:     PaymentMethod
  paymentReference?: string
  bankAccountNumber?: string   // default: "1930" (Bank)
}

const PAYMENT_METHOD_ACCOUNTS: Record<string, string> = {
  bank_transfer: "1930",
  swish:         "1920",
  cash:          "1910",
}

export async function paySupplierInvoice(input: PaymentInput) {
  const {
    organizationId,
    invoiceId,
    paidByUserId,
    paidAt,
    paidAmount,
    paymentMethod,
    paymentReference,
    bankAccountNumber,
  } = input

  const bankAccount = bankAccountNumber
    ?? PAYMENT_METHOD_ACCOUNTS[paymentMethod]
    ?? "1930"

  // ── Idempotency ───────────────────────────────────────────────────────────
  const idempotencyKey = randomUUID()
  const claimed = await prisma.supplierInvoice.updateMany({
    where: {
      id:                    invoiceId,
      organizationId,
      paymentIdempotencyKey: null,
      status:                "booked",
    },
    data: { paymentIdempotencyKey: idempotencyKey },
  })

  if (claimed.count === 0) {
    const existing = await prisma.supplierInvoice.findUnique({
      where:  { id: invoiceId },
      select: { status: true },
    })
    if (existing?.status === "paid") throw new SupplierInvoiceAlreadyPaidError()
    if (existing?.status !== "booked") throw new SupplierInvoiceNotBookedError()
    throw new Error("payment_in_progress: another payment is already running")
  }

  const invoice = await prisma.supplierInvoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) throw new SupplierInvoiceNotFoundError(invoiceId)

  // Resolve accounts
  const bankAcct = await getAccountByNumber(organizationId, bankAccount)
  if (!bankAcct) throw new MissingFieldsError([`account ${bankAccount}`])
  const apAcct   = await getAccountByNumber(organizationId, "2440")
  if (!apAcct)   throw new MissingFieldsError(["account 2440"])

  // DR 2440 leverantörsskulder / CR bank
  const journal = await createJournal({
    organizationId,
    seriesPrefix:    "L",
    date:            paidAt.toISOString().slice(0, 10),
    description:     `Betalning lev.fakt ${invoice.invoiceNumber ?? ""} — ${invoice.supplierName ?? ""}`,
    sourceType:      "supplier_payment",
    sourceId:        invoiceId,
    createdByUserId: paidByUserId,
    entries: [
      { accountId: apAcct.id,   debit: paidAmount, credit: 0n },
      { accountId: bankAcct.id, debit: 0n,         credit: paidAmount,
        description: paymentReference },
    ],
  })

  await postJournal(organizationId, journal.id, paidByUserId)

  const updated = await prisma.supplierInvoice.update({
    where: { id: invoiceId },
    data:  {
      status:           "paid",
      paidAt,
      paidAmount,
      paymentMethod,
      paymentReference: paymentReference ?? null,
      paymentJournalId: journal.id,
      paidByUserId,
    },
  })

  prisma.auditLog.create({
    data: {
      organizationId,
      userId:     paidByUserId,
      action:     "update",
      entityType: "SupplierInvoice",
      entityId:   invoiceId,
      meta:       { event: "paid", journalId: journal.id, amount: paidAmount.toString() },
    },
  }).catch(() => {})

  return { invoice: updated, journal }
}
