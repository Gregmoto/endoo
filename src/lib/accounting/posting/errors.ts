/**
 * Typed error taxonomy for the posting engine.
 * These are distinct from journal-level errors (journals.ts).
 */

export class InvoiceAlreadyPostedError extends Error {
  readonly journalId: string
  constructor(invoiceId: string, journalId: string) {
    super(`Invoice ${invoiceId} is already posted to journal ${journalId}`)
    this.journalId = journalId
  }
}

export class PaymentAlreadyPostedError extends Error {
  readonly journalId: string
  constructor(paymentId: string, journalId: string) {
    super(`Payment ${paymentId} is already posted to journal ${journalId}`)
    this.journalId = journalId
  }
}

export class PostingLockedError extends Error {
  constructor(event: string, entityId: string) {
    super(`Posting lock held for ${event} on ${entityId} — another posting is in progress`)
  }
}

export class AccountSlotMissingError extends Error {
  readonly slot:          string
  readonly accountNumber: string
  constructor(slot: string, accountNumber: string) {
    super(`Account slot "${slot}" requires account ${accountNumber} but it does not exist in the org's chart of accounts`)
    this.slot          = slot
    this.accountNumber = accountNumber
  }
}

export class InvoiceNotFoundError extends Error {
  constructor(id: string) { super(`Invoice not found: ${id}`) }
}

export class PaymentNotFoundError extends Error {
  constructor(id: string) { super(`Payment not found: ${id}`) }
}

export class VatBucketError extends Error {
  constructor(msg: string) { super(`VAT bucketing error: ${msg}`) }
}

export class PostingUnsupportedTypeError extends Error {
  constructor(type: string) { super(`Posting not supported for invoice type: ${type}`) }
}

// ─── Period / void errors ─────────────────────────────────────────────────────

export class PeriodLockedError extends Error {
  readonly periodId: string
  constructor(year: number, month: number, periodId: string) {
    super(`Accounting period ${year}-${String(month).padStart(2, "0")} is locked — cannot post new journals`)
    this.periodId = periodId
    this.name = "PeriodLockedError"
  }
}

export class PeriodClosedError extends Error {
  readonly periodId: string
  constructor(year: number, month: number, periodId: string) {
    super(`Accounting period ${year}-${String(month).padStart(2, "0")} is closed — contact platform admin to reopen`)
    this.periodId = periodId
    this.name = "PeriodClosedError"
  }
}

export class PeriodNotFoundError extends Error {
  constructor(id: string) {
    super(`Accounting period not found: ${id}`)
    this.name = "PeriodNotFoundError"
  }
}

export class JournalNotPostedError extends Error {
  constructor(id: string) {
    super(`Journal ${id} is not in posted status — only posted journals can be voided`)
    this.name = "JournalNotPostedError"
  }
}

export class JournalAlreadyVoidedError extends Error {
  readonly journalId: string
  constructor(id: string) {
    super(`Journal ${id} is already voided`)
    this.journalId = id
    this.name = "JournalAlreadyVoidedError"
  }
}

export class JournalNotFoundError extends Error {
  constructor(id: string) {
    super(`Journal not found: ${id}`)
    this.name = "JournalNotFoundError"
  }
}
