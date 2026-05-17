/**
 * Invoice posting service
 *
 * postInvoiceSent:
 *   Creates and posts the AR journal when an invoice is sent.
 *   Idempotent: journalSentId guards against double-posting.
 *   Atomic: journal creation + invoice update in one transaction.
 *
 * postInvoicePaid:
 *   Creates and posts the payment journal (Bank / CR AR).
 *   Idempotent: Payment.journalId guards against double-posting.
 *   Atomic: journal creation + payment update in one transaction.
 *
 * Both functions use a two-field idempotency pattern:
 *   journalPostingLockedAt — set BEFORE the transaction (prevents concurrent posting)
 *   journalSentId / journalId — set INSIDE the transaction (the result)
 * On failure, journalPostingLockedAt is cleared in a catch block so retries work.
 */

import { prisma }               from "@/lib/prisma"
import { resolveAccountSlots }  from "@/lib/accounting/posting/account-slots"
import { bucketByVatRate }      from "@/lib/accounting/posting/vat"
import { buildInvoiceSentEntries, buildPaymentEntries } from "@/lib/accounting/posting/engine"
import {
  InvoiceAlreadyPostedError,
  PaymentAlreadyPostedError,
  PostingLockedError,
  InvoiceNotFoundError,
  PaymentNotFoundError,
  PostingUnsupportedTypeError,
} from "@/lib/accounting/posting/errors"
import { FiscalYearNotFoundError } from "@/lib/accounting/journals"
import { assertPeriodOpen, getOrCreatePeriod } from "@/services/accounting/periods"
import type { Journal, PaymentMethod } from "@prisma/client"

// ─── postInvoiceSent ──────────────────────────────────────────────────────────

/**
 * Posts the AR / Revenue / VAT-out journal for a sent invoice.
 * Call this immediately after marking the invoice as sent.
 *
 * Supported invoice types: "invoice", "credit_note"
 * Unsupported: "quote", "proforma" (throws PostingUnsupportedTypeError)
 */
export async function postInvoiceSent(
  organizationId: string,
  invoiceId:      string,
  userId:         string | null,
): Promise<Journal> {
  // Fetch invoice with line items and contact name
  const invoice = await prisma.invoice.findFirst({
    where:   { id: invoiceId, organizationId },
    include: {
      lineItems: { select: { taxRate: true, lineTotal: true, taxAmount: true } },
      contact:   { select: { name: true } },
    },
  })
  if (!invoice) throw new InvoiceNotFoundError(invoiceId)

  // Only support invoice and credit_note types
  if (invoice.type === "quote" || invoice.type === "proforma") {
    throw new PostingUnsupportedTypeError(invoice.type)
  }

  // Already posted — return idempotent result
  if (invoice.journalSentId) {
    throw new InvoiceAlreadyPostedError(invoiceId, invoice.journalSentId)
  }

  // Claim posting lock (atomic updateMany — blocks concurrent callers)
  const claimed = await prisma.invoice.updateMany({
    where: {
      id:                     invoiceId,
      organizationId,
      journalSentId:          null,
      journalPostingLockedAt: null,
    },
    data: { journalPostingLockedAt: new Date() },
  })

  if (claimed.count === 0) {
    throw new PostingLockedError("INVOICE_SENT", invoiceId)
  }

  try {
    // Resolve account slots and build entries (outside tx — read-only lookups)
    const slots   = await resolveAccountSlots(organizationId)
    const buckets = bucketByVatRate(invoice.lineItems)
    const contactName  = invoice.contact?.name ?? ""
    const description  = invoice.type === "credit_note"
      ? `Kreditnota ${invoice.invoiceNumber} — ${contactName}`
      : `Faktura ${invoice.invoiceNumber} — ${contactName}`
    const grossTotal   = invoice.totalAmount

    const entries = buildInvoiceSentEntries(slots, buckets, grossTotal, description)
    const journalDate  = invoice.issueDate
    const dateStr      = journalDate.toISOString().slice(0, 10)

    // Atomic: resolve fiscal year + period + increment series + create journal + update invoice
    const journal = await prisma.$transaction(async (tx) => {
      // Resolve open fiscal year
      const fy = await tx.fiscalYear.findFirst({
        where: {
          organizationId,
          startDate: { lte: journalDate },
          endDate:   { gte: journalDate },
          status:    "open",
        },
      })
      if (!fy) throw new FiscalYearNotFoundError()

      // Guard: reject if accounting period is locked or closed
      await assertPeriodOpen(tx, organizationId, journalDate)

      // Lazy-create accounting period for this month
      const period = await getOrCreatePeriod(tx, organizationId, fy.id, journalDate)

      // Increment series counter (atomic with the journal create)
      const series = await tx.journalSeries.update({
        where: { organizationId_prefix: { organizationId, prefix: "A" } },
        data:  { currentSeq: { increment: 1 } },
      })

      const number    = series.currentSeq
      const reference = `A-${String(number).padStart(4, "0")}`
      const now       = new Date()

      // Create journal directly as posted
      const created = await tx.journal.create({
        data: {
          organizationId,
          fiscalYearId:    fy.id,
          seriesId:        series.id,
          periodId:        period.id,
          number,
          reference,
          date:            new Date(dateStr),
          description,
          status:          "posted",
          postedAt:        now,
          postedByUserId:  userId,
          createdByUserId: userId,
          sourceType:      invoice.type === "credit_note" ? "credit_note" : "invoice",
          sourceId:        invoiceId,
          entries: {
            create: entries.map((e, i) => ({
              organizationId,
              accountId:   e.accountId,
              debit:       e.debit,
              credit:      e.credit,
              description: e.description ?? null,
              vatCode:     e.vatCode    ?? null,
              sortOrder:   i,
            })),
          },
        },
      })

      // Update invoice: set journalSentId, clear lock
      await tx.invoice.update({
        where: { id: invoiceId },
        data:  {
          journalSentId:          created.id,
          journalPostingLockedAt: null,
        },
      })

      return created
    })

    // Audit log (fire-and-forget)
    prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "invoice_post",
        entityType: "Invoice",
        entityId:   invoiceId,
        meta: {
          journalId:   journal.id,
          reference:   journal.reference,
          invoiceType: invoice.type,
        },
      },
    }).catch(() => {})

    return journal

  } catch (err) {
    // Clear the posting lock so retries work
    await prisma.invoice.updateMany({
      where: { id: invoiceId, organizationId, journalSentId: null },
      data:  { journalPostingLockedAt: null },
    }).catch(() => {})

    // Emit failure audit log (best-effort)
    prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "posting_failed",
        entityType: "Invoice",
        entityId:   invoiceId,
        meta: { event: "INVOICE_SENT", error: String(err) },
      },
    }).catch(() => {})

    throw err
  }
}

// ─── postInvoicePaid ──────────────────────────────────────────────────────────

/**
 * Posts the Bank / AR journal when a payment is recorded.
 * Call this immediately after creating the Payment row.
 *
 * credit_note payments do not generate a bank entry — skipped silently.
 */
export async function postInvoicePaid(
  organizationId: string,
  paymentId:      string,
  userId:         string | null,
): Promise<Journal | null> {
  const payment = await prisma.payment.findFirst({
    where:   { id: paymentId, organizationId },
    include: { invoice: { select: { invoiceNumber: true, contact: { select: { name: true } } } } },
  })
  if (!payment) throw new PaymentNotFoundError(paymentId)

  // credit_note payments are AR offsets — no bank posting needed
  if (payment.method === "credit_note") return null

  // Already posted
  if (payment.journalId) {
    throw new PaymentAlreadyPostedError(paymentId, payment.journalId)
  }

  // Claim posting lock
  const claimed = await prisma.payment.updateMany({
    where: {
      id:                     paymentId,
      organizationId,
      journalId:              null,
      journalPostingLockedAt: null,
    },
    data: { journalPostingLockedAt: new Date() },
  })

  if (claimed.count === 0) {
    throw new PostingLockedError("INVOICE_PAID", paymentId)
  }

  try {
    const slots       = await resolveAccountSlots(organizationId)
    const contactName = payment.invoice?.contact?.name ?? ""
    const invoiceNum  = payment.invoice?.invoiceNumber ?? ""
    const description = `Betalning faktura ${invoiceNum} — ${contactName}`

    const entries = buildPaymentEntries(
      slots,
      payment.amount,
      payment.method as PaymentMethod,
      description,
    )

    const journalDate = payment.paymentDate
    const dateStr     = journalDate.toISOString().slice(0, 10)

    const journal = await prisma.$transaction(async (tx) => {
      const fy = await tx.fiscalYear.findFirst({
        where: {
          organizationId,
          startDate: { lte: journalDate },
          endDate:   { gte: journalDate },
          status:    "open",
        },
      })
      if (!fy) throw new FiscalYearNotFoundError()

      // Guard: reject if accounting period is locked or closed
      await assertPeriodOpen(tx, organizationId, journalDate)

      // Lazy-create accounting period for this month
      const period = await getOrCreatePeriod(tx, organizationId, fy.id, journalDate)

      const series = await tx.journalSeries.update({
        where: { organizationId_prefix: { organizationId, prefix: "A" } },
        data:  { currentSeq: { increment: 1 } },
      })

      const number    = series.currentSeq
      const reference = `A-${String(number).padStart(4, "0")}`
      const now       = new Date()

      const created = await tx.journal.create({
        data: {
          organizationId,
          fiscalYearId:    fy.id,
          seriesId:        series.id,
          periodId:        period.id,
          number,
          reference,
          date:            new Date(dateStr),
          description,
          status:          "posted",
          postedAt:        now,
          postedByUserId:  userId,
          createdByUserId: userId,
          sourceType:      "payment",
          sourceId:        paymentId,
          entries: {
            create: entries.map((e, i) => ({
              organizationId,
              accountId:   e.accountId,
              debit:       e.debit,
              credit:      e.credit,
              description: e.description ?? null,
              vatCode:     null,
              sortOrder:   i,
            })),
          },
        },
      })

      await tx.payment.update({
        where: { id: paymentId },
        data:  {
          journalId:              created.id,
          journalPostingLockedAt: null,
        },
      })

      return created
    })

    prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "payment_post",
        entityType: "Payment",
        entityId:   paymentId,
        meta: { journalId: journal.id, reference: journal.reference, amount: payment.amount.toString() },
      },
    }).catch(() => {})

    return journal

  } catch (err) {
    // Clear posting lock
    await prisma.payment.updateMany({
      where: { id: paymentId, organizationId, journalId: null },
      data:  { journalPostingLockedAt: null },
    }).catch(() => {})

    prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "posting_failed",
        entityType: "Payment",
        entityId:   paymentId,
        meta: { event: "INVOICE_PAID", error: String(err) },
      },
    }).catch(() => {})

    throw err
  }
}
