/**
 * Endoo RBAC — Permission definitions
 *
 * Format: "resource:action"
 * All permissions are constants so TypeScript catches typos at compile time.
 *
 * Two levels:
 *   PLATFORM_*  → super_admin only, cross-tenant
 *   everything else → scoped to a single organization (tenant)
 */

// ─────────────────────────────────────────────
// PLATFORM PERMISSIONS (super_admin only)
// ─────────────────────────────────────────────
export const PLATFORM_PERMISSIONS = {
  READ_ORGS:            "platform:read_orgs",
  MANAGE_ORGS:          "platform:manage_orgs",        // create, update, suspend, delete
  MANAGE_USERS:         "platform:manage_users",        // edit any user globally
  MANAGE_SUBSCRIPTIONS: "platform:manage_subscriptions",
  VIEW_AUDIT_LOGS:      "platform:view_audit_logs",     // cross-tenant audit log access
  IMPERSONATE_ORG:      "platform:impersonate_org",     // act as any organization
  MANAGE_SETTINGS:      "platform:manage_settings",     // platform-wide config
  SECURITY_READ:        "platform:security:read",       // tenant-isolation audit report
} as const

// ─────────────────────────────────────────────
// INVOICE PERMISSIONS
// ─────────────────────────────────────────────
export const INVOICE_PERMISSIONS = {
  READ:            "invoices:read",
  CREATE:          "invoices:create",
  UPDATE:          "invoices:update",
  DELETE:          "invoices:delete",           // only drafts
  SEND:            "invoices:send",
  VOID:            "invoices:void",
  EXPORT:          "invoices:export",           // PDF download / bulk export
  CREATE_INTEREST: "invoices:create_interest",  // create interest invoices
  BULK:            "invoices:bulk",             // bulk send/print/book
} as const

// ─────────────────────────────────────────────
// CONTACT PERMISSIONS
// ─────────────────────────────────────────────
export const CONTACT_PERMISSIONS = {
  READ:          "contacts:read",
  CREATE:        "contacts:create",
  UPDATE:        "contacts:update",
  DELETE:        "contacts:delete",
  BULK_UPDATE:   "contacts:bulk_update",
  EXPORT:        "contacts:export",
  IMPORT:        "contacts:import",
  VIES_VALIDATE: "contacts:vies_validate",
} as const

// ─────────────────────────────────────────────
// PRODUCT / SERVICE PERMISSIONS
// ─────────────────────────────────────────────
export const PRODUCT_PERMISSIONS = {
  READ:   "products:read",
  CREATE: "products:create",
  UPDATE: "products:update",
  DELETE: "products:delete",
} as const

// ─────────────────────────────────────────────
// PAYMENT PERMISSIONS
// ─────────────────────────────────────────────
export const PAYMENT_PERMISSIONS = {
  READ:              "payments:read",
  CREATE:            "payments:create",            // record a payment
  DELETE:            "payments:delete",            // reverse a payment
  IMPORT_FILE:       "payments:import_file",       // BGMax/camt/CSV import
  WRITE_OFF_UNMATCHED: "payments:write_off_unmatched", // delete unmatched
} as const

// ─────────────────────────────────────────────
// REMINDER PERMISSIONS
// ─────────────────────────────────────────────
export const REMINDER_PERMISSIONS = {
  READ: "reminders:read",
  SEND: "reminders:send",
} as const

// ─────────────────────────────────────────────
// RECURRING INVOICE PERMISSIONS
// ─────────────────────────────────────────────
export const RECURRING_PERMISSIONS = {
  READ:     "recurring:read",
  CREATE:   "recurring:create",
  UPDATE:   "recurring:update",
  DELETE:   "recurring:delete",
  ACTIVATE: "recurring:activate",
  PAUSE:    "recurring:pause",
  END:      "recurring:end",
} as const

// ─────────────────────────────────────────────
// USER MANAGEMENT PERMISSIONS (within an org)
// ─────────────────────────────────────────────
export const USER_PERMISSIONS = {
  READ:        "users:read",
  INVITE:      "users:invite",
  UPDATE_ROLE: "users:update_role",
  REMOVE:      "users:remove",
} as const

// ─────────────────────────────────────────────
// SETTINGS PERMISSIONS
// ─────────────────────────────────────────────
export const SETTINGS_PERMISSIONS = {
  READ:           "settings:read",
  UPDATE:         "settings:update",          // org name, address, branding
  MANAGE_BILLING: "settings:manage_billing",  // change SaaS plan
  DELETE_ORG:     "settings:delete_org",
} as const

// ─────────────────────────────────────────────
// REPORT PERMISSIONS
// ─────────────────────────────────────────────
export const REPORT_PERMISSIONS = {
  READ:   "reports:read",
  EXPORT: "reports:export",
} as const

// ─────────────────────────────────────────────
// CONTRACT / RECURRING SCHEDULE PERMISSIONS
// ─────────────────────────────────────────────
export const CONTRACT_PERMISSIONS = {
  READ:   "contracts:read",
  CREATE: "contracts:create",
  UPDATE: "contracts:update",
  DELETE: "contracts:delete",
} as const

// ─────────────────────────────────────────────
// ACCOUNTING PERMISSIONS
// ─────────────────────────────────────────────
export const ACCOUNTING_PERMISSIONS = {
  READ:              "accounting:read",              // view ledger, reports, chart of accounts
  POST:              "accounting:post",              // post and void journal entries
  MANAGE_ACCOUNTS:   "accounting:manage_accounts",   // add/edit custom accounts, deactivate
  MANAGE_PERIODS:    "accounting:manage_periods",    // close fiscal years, lock VAT periods
  EXPORT:            "accounting:export",            // SIE4 export
  IMPORT_SIE:        "accounting:import:sie",        // SIE 4i/4e import
  YEAR_END_READ:     "accounting:year_end:read",     // view year-end status and closing statements
  YEAR_END_CLOSE:    "accounting:year_end:close",    // execute year-end closing (all periods must be locked)
  YEAR_END_REOPEN:   "accounting:year_end:reopen",   // super_admin only: reopen a closed fiscal year
} as const

// ─────────────────────────────────────────────
// SUPPLIER INVOICE PERMISSIONS
// ─────────────────────────────────────────────
export const SUPPLIER_INVOICE_PERMISSIONS = {
  READ:             "supplier_invoices:read",
  UPLOAD:           "supplier_invoices:upload",          // upload + trigger extraction
  REVIEW:           "supplier_invoices:review",          // edit extracted fields
  BOOK:             "supplier_invoices:book",            // post journal
  PAY:              "supplier_invoices:pay",             // mark as paid
  MANAGE_SUPPLIERS: "supplier_invoices:manage_suppliers", // edit supplier register
  DELETE:           "supplier_invoices:delete",          // delete draft invoices
  ATTEST:           "supplier_invoices:attest",          // cast approval votes
  MANAGE_APPROVALS: "supplier_invoices:manage_approvals", // configure approval policies
} as const

// ─────────────────────────────────────────────
// INVENTORY PERMISSIONS
// ─────────────────────────────────────────────
export const INVENTORY_PERMISSIONS = {
  READ:   "inventory:read",
  WRITE:  "inventory:write",   // add transactions, create items
  COUNT:  "inventory:count",   // run stock counts (inventering)
  MANAGE: "inventory:manage",  // create/edit/deactivate items
} as const

// ─────────────────────────────────────────────
// AGENCY PERMISSIONS (only meaningful in agency orgs)
// ─────────────────────────────────────────────
export const AGENCY_PERMISSIONS = {
  READ_CLIENTS:       "agency:read_clients",        // list managed clients
  MANAGE_CLIENTS:     "agency:manage_clients",       // add / remove client relationships
  SWITCH_TO_CLIENT:   "agency:switch_to_client",     // enter client context
  GRANT_STAFF_ACCESS: "agency:grant_staff_access",   // give staff access to a client
} as const

// ─────────────────────────────────────────────
// Union type of all permissions
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// TASK PERMISSIONS
// ─────────────────────────────────────────────
export const TASK_PERMISSIONS = {
  READ:        "tasks:read",
  CREATE:      "tasks:create",
  UPDATE_OWN:  "tasks:update_own",
  UPDATE_ANY:  "tasks:update_any",
  DELETE_OWN:  "tasks:delete_own",
  DELETE_ANY:  "tasks:delete_any",
  ASSIGN:      "tasks:assign",
  COMMENT:     "tasks:comment",
} as const

// ─────────────────────────────────────────────
// SIGNATURE PERMISSIONS
// ─────────────────────────────────────────────
export const SIGNATURE_PERMISSIONS = {
  READ:   "signatures:read",
  CREATE: "signatures:create",
  SEND:   "signatures:send",
  CANCEL: "signatures:cancel",
  REMIND: "signatures:remind",
} as const

// ─────────────────────────────────────────────
// BRANDING PERMISSIONS
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// QUOTE PERMISSIONS
// ─────────────────────────────────────────────
export const QUOTE_PERMISSIONS = {
  READ:    "quotes:read",
  CREATE:  "quotes:create",
  UPDATE:  "quotes:update",
  SEND:    "quotes:send",
  CANCEL:  "quotes:cancel",
  CONVERT: "quotes:convert",  // → invoice or contract
} as const

// ─────────────────────────────────────────────
// BRANDING PERMISSIONS
// ─────────────────────────────────────────────
export const BRANDING_PERMISSIONS = {
  READ:          "branding:read",
  UPDATE:        "branding:update",
  UPLOAD_ASSETS: "branding:upload_assets",
  WHITE_LABEL:   "branding:white_label",   // toggle applyToClients (agency-only)
} as const

// ─────────────────────────────────────────────
// EMAIL AUDIT PERMISSIONS
// ─────────────────────────────────────────────
export const EMAIL_PERMISSIONS = {
  READ_LOGS:    "audit:email_logs:read",   // view email delivery log
  MANAGE:       "settings:email:update",   // update email settings
} as const

// ─────────────────────────────────────────────
// INVOICING SETTINGS PERMISSIONS
// ─────────────────────────────────────────────
export const INVOICING_SETTINGS_PERMISSIONS = {
  READ:   "settings:invoicing:read",
  UPDATE: "settings:invoicing:update",
} as const

export const PAYMENT_TERMS_PERMISSIONS = {
  READ:   "settings:payment_terms:read",
  CREATE: "settings:payment_terms:create",
  UPDATE: "settings:payment_terms:update",
  DELETE: "settings:payment_terms:delete",
} as const

export const UNITS_PERMISSIONS = {
  READ:   "settings:units:read",
  CREATE: "settings:units:create",
  UPDATE: "settings:units:update",
  DELETE: "settings:units:delete",
} as const

export const CURRENCIES_PERMISSIONS = {
  READ:   "settings:currencies:read",
  CREATE: "settings:currencies:create",
  UPDATE: "settings:currencies:update",
  DELETE: "settings:currencies:delete",
} as const

export const DELIVERY_METHODS_PERMISSIONS = {
  READ:   "settings:delivery_methods:read",
  CREATE: "settings:delivery_methods:create",
  UPDATE: "settings:delivery_methods:update",
  DELETE: "settings:delivery_methods:delete",
} as const

export const DELIVERY_TERMS_PERMISSIONS = {
  READ:   "settings:delivery_terms:read",
  CREATE: "settings:delivery_terms:create",
  UPDATE: "settings:delivery_terms:update",
  DELETE: "settings:delivery_terms:delete",
} as const

export const PRICE_LISTS_PERMISSIONS = {
  READ:   "settings:price_lists:read",
  CREATE: "settings:price_lists:create",
  UPDATE: "settings:price_lists:update",
  DELETE: "settings:price_lists:delete",
} as const

export const INVOICE_TEMPLATES_PERMISSIONS = {
  READ:   "settings:invoice_templates:read",
  CREATE: "settings:invoice_templates:create",
  UPDATE: "settings:invoice_templates:update",
  DELETE: "settings:invoice_templates:delete",
} as const

export const EXCHANGE_RATES_PERMISSIONS = {
  READ:    "exchange_rates:read",
  REFRESH: "exchange_rates:refresh",
} as const

// ─────────────────────────────────────────────
// SRU EXPORT PERMISSIONS
// ─────────────────────────────────────────────
export const SRU_EXPORT_PERMISSIONS = {
  READ:     "accounting:sru:read",     // view SRU export history
  GENERATE: "accounting:sru:generate", // generate new SRU export
} as const

// ─────────────────────────────────────────────
// SIE IMPORT PERMISSIONS
// ─────────────────────────────────────────────
export const SIE_IMPORT_PERMISSIONS = {
  READ:    "accounting:import:sie:read",    // view import jobs and history
  EXECUTE: "accounting:import:sie",         // upload + execute imports
} as const

// ─────────────────────────────────────────────
// ACCRUAL PERMISSIONS
// ─────────────────────────────────────────────
export const ACCRUAL_PERMISSIONS = {
  READ:    "accounting:accruals:read",
  CREATE:  "accounting:accruals:create",
  UPDATE:  "accounting:accruals:update",
  DELETE:  "accounting:accruals:delete",
  REVERSE: "accounting:accruals:reverse",
} as const

// ─────────────────────────────────────────────
// FIXED ASSET PERMISSIONS
// ─────────────────────────────────────────────
export const FIXED_ASSET_PERMISSIONS = {
  READ:    "fixed_assets:read",
  CREATE:  "fixed_assets:create",
  UPDATE:  "fixed_assets:update",
  DISPOSE: "fixed_assets:dispose",   // mark as disposed/written_off
  DELETE:  "fixed_assets:delete",    // delete active asset (admin only)
} as const

// ─────────────────────────────────────────────
// DEPRECIATION PERMISSIONS
// ─────────────────────────────────────────────
export const DEPRECIATION_PERMISSIONS = {
  READ:    "depreciation:read",
  POST:    "depreciation:post",      // post a depreciation period
  REVERSE: "depreciation:reverse",   // reverse a posted depreciation
} as const

export type Permission =
  | (typeof REMINDER_PERMISSIONS)[keyof typeof REMINDER_PERMISSIONS]
  | (typeof RECURRING_PERMISSIONS)[keyof typeof RECURRING_PERMISSIONS]
  | (typeof INVOICING_SETTINGS_PERMISSIONS)[keyof typeof INVOICING_SETTINGS_PERMISSIONS]
  | (typeof PAYMENT_TERMS_PERMISSIONS)[keyof typeof PAYMENT_TERMS_PERMISSIONS]
  | (typeof UNITS_PERMISSIONS)[keyof typeof UNITS_PERMISSIONS]
  | (typeof CURRENCIES_PERMISSIONS)[keyof typeof CURRENCIES_PERMISSIONS]
  | (typeof DELIVERY_METHODS_PERMISSIONS)[keyof typeof DELIVERY_METHODS_PERMISSIONS]
  | (typeof DELIVERY_TERMS_PERMISSIONS)[keyof typeof DELIVERY_TERMS_PERMISSIONS]
  | (typeof PRICE_LISTS_PERMISSIONS)[keyof typeof PRICE_LISTS_PERMISSIONS]
  | (typeof INVOICE_TEMPLATES_PERMISSIONS)[keyof typeof INVOICE_TEMPLATES_PERMISSIONS]
  | (typeof EXCHANGE_RATES_PERMISSIONS)[keyof typeof EXCHANGE_RATES_PERMISSIONS]
  | (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS]
  | (typeof INVOICE_PERMISSIONS)[keyof typeof INVOICE_PERMISSIONS]
  | (typeof CONTACT_PERMISSIONS)[keyof typeof CONTACT_PERMISSIONS]
  | (typeof PRODUCT_PERMISSIONS)[keyof typeof PRODUCT_PERMISSIONS]
  | (typeof PAYMENT_PERMISSIONS)[keyof typeof PAYMENT_PERMISSIONS]
  | (typeof CONTRACT_PERMISSIONS)[keyof typeof CONTRACT_PERMISSIONS]
  | (typeof USER_PERMISSIONS)[keyof typeof USER_PERMISSIONS]
  | (typeof SETTINGS_PERMISSIONS)[keyof typeof SETTINGS_PERMISSIONS]
  | (typeof REPORT_PERMISSIONS)[keyof typeof REPORT_PERMISSIONS]
  | (typeof ACCOUNTING_PERMISSIONS)[keyof typeof ACCOUNTING_PERMISSIONS]
  | (typeof SUPPLIER_INVOICE_PERMISSIONS)[keyof typeof SUPPLIER_INVOICE_PERMISSIONS]
  | (typeof INVENTORY_PERMISSIONS)[keyof typeof INVENTORY_PERMISSIONS]
  | (typeof AGENCY_PERMISSIONS)[keyof typeof AGENCY_PERMISSIONS]
  | (typeof TASK_PERMISSIONS)[keyof typeof TASK_PERMISSIONS]
  | (typeof SIGNATURE_PERMISSIONS)[keyof typeof SIGNATURE_PERMISSIONS]
  | (typeof QUOTE_PERMISSIONS)[keyof typeof QUOTE_PERMISSIONS]
  | (typeof BRANDING_PERMISSIONS)[keyof typeof BRANDING_PERMISSIONS]
  | (typeof EMAIL_PERMISSIONS)[keyof typeof EMAIL_PERMISSIONS]
  | (typeof SRU_EXPORT_PERMISSIONS)[keyof typeof SRU_EXPORT_PERMISSIONS]
  | (typeof SIE_IMPORT_PERMISSIONS)[keyof typeof SIE_IMPORT_PERMISSIONS]
  | (typeof ACCRUAL_PERMISSIONS)[keyof typeof ACCRUAL_PERMISSIONS]
  | (typeof FIXED_ASSET_PERMISSIONS)[keyof typeof FIXED_ASSET_PERMISSIONS]
  | (typeof DEPRECIATION_PERMISSIONS)[keyof typeof DEPRECIATION_PERMISSIONS]

export const ALL_PERMISSIONS: Permission[] = [
  ...Object.values(REMINDER_PERMISSIONS),
  ...Object.values(RECURRING_PERMISSIONS),
  ...Object.values(INVOICING_SETTINGS_PERMISSIONS),
  ...Object.values(PAYMENT_TERMS_PERMISSIONS),
  ...Object.values(UNITS_PERMISSIONS),
  ...Object.values(CURRENCIES_PERMISSIONS),
  ...Object.values(DELIVERY_METHODS_PERMISSIONS),
  ...Object.values(DELIVERY_TERMS_PERMISSIONS),
  ...Object.values(PRICE_LISTS_PERMISSIONS),
  ...Object.values(INVOICE_TEMPLATES_PERMISSIONS),
  ...Object.values(EXCHANGE_RATES_PERMISSIONS),
  ...Object.values(PLATFORM_PERMISSIONS),
  ...Object.values(INVOICE_PERMISSIONS),
  ...Object.values(CONTACT_PERMISSIONS),
  ...Object.values(PRODUCT_PERMISSIONS),
  ...Object.values(PAYMENT_PERMISSIONS),
  ...Object.values(CONTRACT_PERMISSIONS),
  ...Object.values(USER_PERMISSIONS),
  ...Object.values(SETTINGS_PERMISSIONS),
  ...Object.values(REPORT_PERMISSIONS),
  ...Object.values(ACCOUNTING_PERMISSIONS),
  ...Object.values(SUPPLIER_INVOICE_PERMISSIONS),
  ...Object.values(INVENTORY_PERMISSIONS),
  ...Object.values(AGENCY_PERMISSIONS),
  ...Object.values(TASK_PERMISSIONS),
  ...Object.values(SIGNATURE_PERMISSIONS),
  ...Object.values(QUOTE_PERMISSIONS),
  ...Object.values(BRANDING_PERMISSIONS),
  ...Object.values(EMAIL_PERMISSIONS),
  ...Object.values(SRU_EXPORT_PERMISSIONS),
  ...Object.values(SIE_IMPORT_PERMISSIONS),
  ...Object.values(ACCRUAL_PERMISSIONS),
  ...Object.values(FIXED_ASSET_PERMISSIONS),
  ...Object.values(DEPRECIATION_PERMISSIONS),
]
