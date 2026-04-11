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
// Helper: read a typed setting from a flat map
// ─────────────────────────────────────────────

type SettingsMap = Record<string, unknown>

export function getSetting<T>(map: SettingsMap, key: string, fallback: T): T {
  const val = map[key]
  if (val === undefined || val === null) return fallback
  return val as T
}
