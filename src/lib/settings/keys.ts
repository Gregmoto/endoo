/**
 * Endoo — OrganizationSetting key constants
 *
 * Settings stored in the key/value OrganizationSetting table.
 * First-class fields (name, address, bank details, etc.) live
 * directly on the Organization model instead.
 */

export const SETTING_KEYS = {
  // Invoice display
  INVOICE_PRICES_INCLUDE_TAX: "invoice.pricesIncludeTax",  // boolean, default false
  INVOICE_ROUNDING_MODE:      "invoice.roundingMode",       // "none"|"nearest"|"up"|"down"
  INVOICE_DEFAULT_NOTES:      "invoice.defaultNotes",       // string
  INVOICE_DEFAULT_FOOTER:     "invoice.defaultFooter",      // string

  // Payment
  PAYMENT_SWISH:              "payment.swish",              // string, Swish-nummer
  PAYMENT_REFERENCE_FORMAT:   "payment.referenceFormat",    // "invoice_number"|"ocr"|"custom"
  PAYMENT_REFERENCE_CUSTOM:   "payment.referenceCustom",    // string, used when format=custom

  // Email (Fas 4)
  EMAIL_SENDER_NAME:     "email.senderName",
  EMAIL_SENDER_ADDRESS:  "email.senderAddress",
  EMAIL_REPLY_TO:        "email.replyTo",
  EMAIL_INVOICE_SUBJECT: "email.invoiceSubject",
  EMAIL_INVOICE_BODY:    "email.invoiceBody",
  EMAIL_REMINDER_SUBJECT:"email.reminderSubject",
  EMAIL_REMINDER_BODY:   "email.reminderBody",

  // Security (org-level)
  SECURITY_REQUIRE_2FA:       "security.require2FA",        // boolean
  SECURITY_SESSION_TIMEOUT_H: "security.sessionTimeoutH",  // number

  // Agency
  AGENCY_DEFAULT_ACCESS:        "agency.defaultAccessLevel",  // "full"|"invoicing_only"|"read_only"
  AGENCY_SHOW_LOGO_ON_CLIENT:   "agency.showLogoOnClient",    // boolean
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

// ─────────────────────────────────────────────
// Accounting slot keys — configurable BAS account overrides
// Stored as OrganizationSetting with key "accounting.slot.{SLOT}"
// ─────────────────────────────────────────────

export const ACCOUNTING_SLOT_KEYS = {
  AR:         "accounting.slot.AR",         // 1510 Kundfordringar
  AP:         "accounting.slot.AP",         // 2440 Leverantörsskulder
  BANK:       "accounting.slot.BANK",       // 1930 Bankgirokonto
  BANK_SWISH: "accounting.slot.BANK_SWISH", // 1920 Plusgiro / Swish
  BANK_CASH:  "accounting.slot.BANK_CASH",  // 1910 Kassa
  REVENUE_25: "accounting.slot.REVENUE_25", // 3001 Tjänsteintäkter 25%
  REVENUE_12: "accounting.slot.REVENUE_12", // 3051 Tjänsteintäkter 12%
  REVENUE_6:  "accounting.slot.REVENUE_6",  // 3101 Tjänsteintäkter 6%
  REVENUE_0:  "accounting.slot.REVENUE_0",  // 3001 Momsfri försäljning
  VAT_OUT_25: "accounting.slot.VAT_OUT_25", // 2610 Utgående moms 25%
  VAT_OUT_12: "accounting.slot.VAT_OUT_12", // 2611 Utgående moms 12%
  VAT_OUT_6:  "accounting.slot.VAT_OUT_6",  // 2612 Utgående moms 6%
  VAT_IN:     "accounting.slot.VAT_IN",     // 2640 Ingående moms
} as const

export type AccountingSlotSettingKey = (typeof ACCOUNTING_SLOT_KEYS)[keyof typeof ACCOUNTING_SLOT_KEYS]

// ─────────────────────────────────────────────
// Helper: read a typed setting from a flat map
// ─────────────────────────────────────────────

type SettingsMap = Record<string, unknown>

export function getSetting<T>(map: SettingsMap, key: string, fallback: T): T {
  const val = map[key]
  if (val === undefined || val === null) return fallback
  return val as T
}
