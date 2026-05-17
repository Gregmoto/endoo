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
} as const

// ─────────────────────────────────────────────
// INVOICE PERMISSIONS
// ─────────────────────────────────────────────
export const INVOICE_PERMISSIONS = {
  READ:   "invoices:read",
  CREATE: "invoices:create",
  UPDATE: "invoices:update",
  DELETE: "invoices:delete",    // only drafts
  SEND:   "invoices:send",
  VOID:   "invoices:void",
  EXPORT: "invoices:export",    // PDF download / bulk export
} as const

// ─────────────────────────────────────────────
// CONTACT PERMISSIONS
// ─────────────────────────────────────────────
export const CONTACT_PERMISSIONS = {
  READ:   "contacts:read",
  CREATE: "contacts:create",
  UPDATE: "contacts:update",
  DELETE: "contacts:delete",
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
  READ:   "payments:read",
  CREATE: "payments:create",   // record a payment
  DELETE: "payments:delete",   // reverse a payment
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
  READ:            "accounting:read",            // view ledger, reports, chart of accounts
  POST:            "accounting:post",            // post and void journal entries
  MANAGE_ACCOUNTS: "accounting:manage_accounts", // add/edit custom accounts, deactivate
  MANAGE_PERIODS:  "accounting:manage_periods",  // close fiscal years, lock VAT periods
  EXPORT:          "accounting:export",          // SIE4 export
} as const

// ─────────────────────────────────────────────
// SUPPLIER INVOICE PERMISSIONS
// ─────────────────────────────────────────────
export const SUPPLIER_INVOICE_PERMISSIONS = {
  READ:             "supplier_invoices:read",
  UPLOAD:           "supplier_invoices:upload",    // upload + trigger extraction
  REVIEW:           "supplier_invoices:review",    // edit extracted fields
  BOOK:             "supplier_invoices:book",      // post journal
  PAY:              "supplier_invoices:pay",       // mark as paid
  MANAGE_SUPPLIERS: "supplier_invoices:manage_suppliers", // edit supplier register
  DELETE:           "supplier_invoices:delete",    // delete draft invoices
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
export type Permission =
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

export const ALL_PERMISSIONS: Permission[] = [
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
]
