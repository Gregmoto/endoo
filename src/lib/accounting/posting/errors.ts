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
