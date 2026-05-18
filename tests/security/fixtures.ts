/**
 * Deterministic IDs and mock resource shapes for tenant-isolation tests.
 *
 * Org A is the authenticated caller.
 * Org B owns the resources that Org A must NOT be able to access.
 */

export const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
export const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
export const USER_A = "useraaa0-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
export const USER_B = "userbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

// ─── Org B resource IDs (things Org A must never see) ────────────────────────

export const B = {
  CONTACT_ID:          "b-contact-0000-0000-000000000001",
  INVOICE_ID:          "b-invoice-0000-0000-000000000001",
  PRODUCT_ID:          "b-product-0000-0000-000000000001",
  QUOTE_ID:            "b-quote-00-0000-0000-000000000001",
  CONTRACT_ID:         "b-contract-000-0000-000000000001",
  JOURNAL_ID:          "b-journal-0000-0000-000000000001",
  PAYMENT_ID:          "b-payment-0000-0000-000000000001",
  SUPPLIER_INVOICE_ID: "b-supinv-00000-0000-000000000001",
  TASK_ID:             "b-task-0000000-0000-000000000001",
  WEBHOOK_ID:          "b-webhook-0000-0000-000000000001",
  API_KEY_ID:          "b-apikey-00000-0000-000000000001",
  CONTACT_NAME:        "Bertil Borgström (Org B)",
  INVOICE_NUMBER:      "ORG-B-2026-0001",
  ORG_SLUG:            "org-b-secret-slug",
}

// ─── Mock resource shapes ────────────────────────────────────────────────────
// These are the objects a buggy route would return if it forgot organizationId.

export const orgBContact = {
  id:             B.CONTACT_ID,
  organizationId: ORG_B,
  name:           B.CONTACT_NAME,
  email:          "bertil@org-b.example.com",
  customerNumber: "K-B-001",
  deletedAt:      null,
}

export const orgBInvoice = {
  id:             B.INVOICE_ID,
  organizationId: ORG_B,
  invoiceNumber:  B.INVOICE_NUMBER,
  contactId:      B.CONTACT_ID,
  status:         "sent",
  totalAmount:    BigInt(500000),
  currency:       "SEK",
  deletedAt:      null,
}

export const orgBProduct = {
  id:             B.PRODUCT_ID,
  organizationId: ORG_B,
  name:           "Org B Hemlig Produkt",
  sku:            "ORG-B-SKU-001",
  deletedAt:      null,
}

export const orgBQuote = {
  id:             B.QUOTE_ID,
  organizationId: ORG_B,
  quoteNumber:    "ORG-B-Q-2026-001",
  contactId:      B.CONTACT_ID,
  status:         "sent",
  totalAmount:    BigInt(300000),
  currency:       "SEK",
  deletedAt:      null,
}

export const orgBJournal = {
  id:             B.JOURNAL_ID,
  organizationId: ORG_B,
  description:    "Org B Secret Journal Entry",
  status:         "posted",
  deletedAt:      null,
}

export const orgBPayment = {
  id:             B.PAYMENT_ID,
  organizationId: ORG_B,
  invoiceId:      B.INVOICE_ID,
  amount:         BigInt(500000),
  currency:       "SEK",
}

// ─── Forbidden strings that must never appear in Org A's responses ───────────

export const FORBIDDEN_STRINGS = [
  ORG_B,
  B.CONTACT_ID,
  B.INVOICE_ID,
  B.PRODUCT_ID,
  B.CONTACT_NAME,
  B.INVOICE_NUMBER,
  "org-b.example.com",
  "Org B Hemlig Produkt",
  "Org B Secret Journal",
]
