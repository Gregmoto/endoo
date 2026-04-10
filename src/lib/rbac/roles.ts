/**
 * Endoo RBAC — Role definitions
 *
 * System roles are DERIVED at runtime — they are NOT stored directly in the DB.
 * The source of truth is:
 *   User.isPlatformAdmin           → "super_admin"
 *   Organization.type + OrganizationMember.role → one of the org roles below
 *
 * Derivation map:
 *   isPlatformAdmin = true                                → super_admin
 *   org.type = 'agency'  + member.role = 'owner'         → agency_owner
 *   org.type = 'agency'  + member.role = 'admin'         → agency_admin
 *   org.type = 'agency'  + member.role = 'member'        → agency_staff
 *   org.type = 'agency'  + member.role = 'viewer'        → agency_viewer
 *   org.type = 'customer'+ member.role = 'owner'         → customer_owner
 *   org.type = 'customer'+ member.role = 'admin'         → customer_admin
 *   org.type = 'customer'+ member.role = 'member'        → customer_user
 *   org.type = 'customer'+ member.role = 'viewer'        → customer_viewer
 *
 * When an agency impersonates a client the effective role is resolved
 * against the client org — see context.ts for that logic.
 */

import {
  PLATFORM_PERMISSIONS,
  INVOICE_PERMISSIONS,
  CONTACT_PERMISSIONS,
  PRODUCT_PERMISSIONS,
  PAYMENT_PERMISSIONS,
  USER_PERMISSIONS,
  SETTINGS_PERMISSIONS,
  REPORT_PERMISSIONS,
  AGENCY_PERMISSIONS,
  type Permission,
} from "./permissions"

export type SystemRole =
  | "super_admin"
  | "agency_owner"
  | "agency_admin"
  | "agency_staff"
  | "agency_viewer"
  | "customer_owner"
  | "customer_admin"
  | "customer_user"
  | "customer_viewer"

// ─────────────────────────────────────────────
// SUPER ADMIN — full platform access
// ─────────────────────────────────────────────
const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  // Platform
  ...Object.values(PLATFORM_PERMISSIONS),
  // Full org-level access (can enter any org context)
  ...Object.values(INVOICE_PERMISSIONS),
  ...Object.values(CONTACT_PERMISSIONS),
  ...Object.values(PRODUCT_PERMISSIONS),
  ...Object.values(PAYMENT_PERMISSIONS),
  ...Object.values(USER_PERMISSIONS),
  ...Object.values(SETTINGS_PERMISSIONS),
  ...Object.values(REPORT_PERMISSIONS),
  ...Object.values(AGENCY_PERMISSIONS),
]

// ─────────────────────────────────────────────
// AGENCY OWNER — full access to own agency + all managed clients
// ─────────────────────────────────────────────
const AGENCY_OWNER_PERMISSIONS: Permission[] = [
  // Invoices
  INVOICE_PERMISSIONS.READ,
  INVOICE_PERMISSIONS.CREATE,
  INVOICE_PERMISSIONS.UPDATE,
  INVOICE_PERMISSIONS.DELETE,
  INVOICE_PERMISSIONS.SEND,
  INVOICE_PERMISSIONS.VOID,
  INVOICE_PERMISSIONS.EXPORT,
  // Contacts
  CONTACT_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.CREATE,
  CONTACT_PERMISSIONS.UPDATE,
  CONTACT_PERMISSIONS.DELETE,
  // Products
  PRODUCT_PERMISSIONS.READ,
  PRODUCT_PERMISSIONS.CREATE,
  PRODUCT_PERMISSIONS.UPDATE,
  PRODUCT_PERMISSIONS.DELETE,
  // Payments
  PAYMENT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.CREATE,
  PAYMENT_PERMISSIONS.DELETE,
  // Users
  USER_PERMISSIONS.READ,
  USER_PERMISSIONS.INVITE,
  USER_PERMISSIONS.UPDATE_ROLE,
  USER_PERMISSIONS.REMOVE,
  // Settings
  SETTINGS_PERMISSIONS.READ,
  SETTINGS_PERMISSIONS.UPDATE,
  SETTINGS_PERMISSIONS.MANAGE_BILLING,
  SETTINGS_PERMISSIONS.DELETE_ORG,
  // Reports
  REPORT_PERMISSIONS.READ,
  REPORT_PERMISSIONS.EXPORT,
  // Agency
  AGENCY_PERMISSIONS.READ_CLIENTS,
  AGENCY_PERMISSIONS.MANAGE_CLIENTS,
  AGENCY_PERMISSIONS.SWITCH_TO_CLIENT,
  AGENCY_PERMISSIONS.GRANT_STAFF_ACCESS,
]

// ─────────────────────────────────────────────
// AGENCY ADMIN — manage agency + clients, no billing/delete
// ─────────────────────────────────────────────
const AGENCY_ADMIN_PERMISSIONS: Permission[] = [
  // Invoices
  INVOICE_PERMISSIONS.READ,
  INVOICE_PERMISSIONS.CREATE,
  INVOICE_PERMISSIONS.UPDATE,
  INVOICE_PERMISSIONS.DELETE,
  INVOICE_PERMISSIONS.SEND,
  INVOICE_PERMISSIONS.VOID,
  INVOICE_PERMISSIONS.EXPORT,
  // Contacts
  CONTACT_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.CREATE,
  CONTACT_PERMISSIONS.UPDATE,
  CONTACT_PERMISSIONS.DELETE,
  // Products
  PRODUCT_PERMISSIONS.READ,
  PRODUCT_PERMISSIONS.CREATE,
  PRODUCT_PERMISSIONS.UPDATE,
  PRODUCT_PERMISSIONS.DELETE,
  // Payments
  PAYMENT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.CREATE,
  PAYMENT_PERMISSIONS.DELETE,
  // Users
  USER_PERMISSIONS.READ,
  USER_PERMISSIONS.INVITE,
  USER_PERMISSIONS.UPDATE_ROLE,
  USER_PERMISSIONS.REMOVE,
  // Settings (no billing, no delete)
  SETTINGS_PERMISSIONS.READ,
  SETTINGS_PERMISSIONS.UPDATE,
  // Reports
  REPORT_PERMISSIONS.READ,
  REPORT_PERMISSIONS.EXPORT,
  // Agency
  AGENCY_PERMISSIONS.READ_CLIENTS,
  AGENCY_PERMISSIONS.MANAGE_CLIENTS,
  AGENCY_PERMISSIONS.SWITCH_TO_CLIENT,
  AGENCY_PERMISSIONS.GRANT_STAFF_ACCESS,
]

// ─────────────────────────────────────────────
// AGENCY STAFF — day-to-day invoicing work
//   Can access clients they have been explicitly granted
// ─────────────────────────────────────────────
const AGENCY_STAFF_PERMISSIONS: Permission[] = [
  // Invoices (no delete, no void)
  INVOICE_PERMISSIONS.READ,
  INVOICE_PERMISSIONS.CREATE,
  INVOICE_PERMISSIONS.UPDATE,
  INVOICE_PERMISSIONS.SEND,
  INVOICE_PERMISSIONS.EXPORT,
  // Contacts (no delete)
  CONTACT_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.CREATE,
  CONTACT_PERMISSIONS.UPDATE,
  // Products (read only)
  PRODUCT_PERMISSIONS.READ,
  // Payments
  PAYMENT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.CREATE,
  // Reports (read only)
  REPORT_PERMISSIONS.READ,
  // Agency (can switch to granted clients)
  AGENCY_PERMISSIONS.READ_CLIENTS,
  AGENCY_PERMISSIONS.SWITCH_TO_CLIENT,
]

// ─────────────────────────────────────────────
// AGENCY VIEWER — read-only access to agency context
// ─────────────────────────────────────────────
const AGENCY_VIEWER_PERMISSIONS: Permission[] = [
  INVOICE_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.READ,
  PRODUCT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.READ,
  REPORT_PERMISSIONS.READ,
  AGENCY_PERMISSIONS.READ_CLIENTS,
]

// ─────────────────────────────────────────────
// CUSTOMER OWNER — full control of own account
// ─────────────────────────────────────────────
const CUSTOMER_OWNER_PERMISSIONS: Permission[] = [
  // Invoices
  INVOICE_PERMISSIONS.READ,
  INVOICE_PERMISSIONS.CREATE,
  INVOICE_PERMISSIONS.UPDATE,
  INVOICE_PERMISSIONS.DELETE,
  INVOICE_PERMISSIONS.SEND,
  INVOICE_PERMISSIONS.VOID,
  INVOICE_PERMISSIONS.EXPORT,
  // Contacts
  CONTACT_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.CREATE,
  CONTACT_PERMISSIONS.UPDATE,
  CONTACT_PERMISSIONS.DELETE,
  // Products
  PRODUCT_PERMISSIONS.READ,
  PRODUCT_PERMISSIONS.CREATE,
  PRODUCT_PERMISSIONS.UPDATE,
  PRODUCT_PERMISSIONS.DELETE,
  // Payments
  PAYMENT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.CREATE,
  PAYMENT_PERMISSIONS.DELETE,
  // Users
  USER_PERMISSIONS.READ,
  USER_PERMISSIONS.INVITE,
  USER_PERMISSIONS.UPDATE_ROLE,
  USER_PERMISSIONS.REMOVE,
  // Settings
  SETTINGS_PERMISSIONS.READ,
  SETTINGS_PERMISSIONS.UPDATE,
  SETTINGS_PERMISSIONS.MANAGE_BILLING,
  SETTINGS_PERMISSIONS.DELETE_ORG,
  // Reports
  REPORT_PERMISSIONS.READ,
  REPORT_PERMISSIONS.EXPORT,
]

// ─────────────────────────────────────────────
// CUSTOMER ADMIN — manage account, no billing/delete
// ─────────────────────────────────────────────
const CUSTOMER_ADMIN_PERMISSIONS: Permission[] = [
  // Invoices
  INVOICE_PERMISSIONS.READ,
  INVOICE_PERMISSIONS.CREATE,
  INVOICE_PERMISSIONS.UPDATE,
  INVOICE_PERMISSIONS.DELETE,
  INVOICE_PERMISSIONS.SEND,
  INVOICE_PERMISSIONS.VOID,
  INVOICE_PERMISSIONS.EXPORT,
  // Contacts
  CONTACT_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.CREATE,
  CONTACT_PERMISSIONS.UPDATE,
  CONTACT_PERMISSIONS.DELETE,
  // Products
  PRODUCT_PERMISSIONS.READ,
  PRODUCT_PERMISSIONS.CREATE,
  PRODUCT_PERMISSIONS.UPDATE,
  // Payments
  PAYMENT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.CREATE,
  // Users (no role changes)
  USER_PERMISSIONS.READ,
  USER_PERMISSIONS.INVITE,
  // Settings (read only)
  SETTINGS_PERMISSIONS.READ,
  // Reports
  REPORT_PERMISSIONS.READ,
  REPORT_PERMISSIONS.EXPORT,
]

// ─────────────────────────────────────────────
// CUSTOMER USER — core invoicing tasks
// ─────────────────────────────────────────────
const CUSTOMER_USER_PERMISSIONS: Permission[] = [
  // Invoices (no delete, no void)
  INVOICE_PERMISSIONS.READ,
  INVOICE_PERMISSIONS.CREATE,
  INVOICE_PERMISSIONS.UPDATE,
  INVOICE_PERMISSIONS.SEND,
  INVOICE_PERMISSIONS.EXPORT,
  // Contacts (no delete)
  CONTACT_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.CREATE,
  CONTACT_PERMISSIONS.UPDATE,
  // Products (read only)
  PRODUCT_PERMISSIONS.READ,
  // Payments
  PAYMENT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.CREATE,
  // Reports
  REPORT_PERMISSIONS.READ,
]

// ─────────────────────────────────────────────
// CUSTOMER VIEWER — read-only
// ─────────────────────────────────────────────
const CUSTOMER_VIEWER_PERMISSIONS: Permission[] = [
  INVOICE_PERMISSIONS.READ,
  CONTACT_PERMISSIONS.READ,
  PRODUCT_PERMISSIONS.READ,
  PAYMENT_PERMISSIONS.READ,
  REPORT_PERMISSIONS.READ,
]

// ─────────────────────────────────────────────
// Role → Permission Set lookup
// ─────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<SystemRole, ReadonlySet<Permission>> = {
  super_admin:     new Set(SUPER_ADMIN_PERMISSIONS),
  agency_owner:    new Set(AGENCY_OWNER_PERMISSIONS),
  agency_admin:    new Set(AGENCY_ADMIN_PERMISSIONS),
  agency_staff:    new Set(AGENCY_STAFF_PERMISSIONS),
  agency_viewer:   new Set(AGENCY_VIEWER_PERMISSIONS),
  customer_owner:  new Set(CUSTOMER_OWNER_PERMISSIONS),
  customer_admin:  new Set(CUSTOMER_ADMIN_PERMISSIONS),
  customer_user:   new Set(CUSTOMER_USER_PERMISSIONS),
  customer_viewer: new Set(CUSTOMER_VIEWER_PERMISSIONS),
}

// ─────────────────────────────────────────────
// Agency access-level overrides
// When agency staff impersonates a client with a restricted
// access level, apply this subset of their permissions.
// ─────────────────────────────────────────────
export const ACCESS_LEVEL_ALLOWED_PERMISSIONS: Record<
  "full" | "invoicing_only" | "read_only",
  ReadonlySet<Permission>
> = {
  full: new Set([
    ...Object.values(INVOICE_PERMISSIONS),
    ...Object.values(CONTACT_PERMISSIONS),
    ...Object.values(PRODUCT_PERMISSIONS),
    ...Object.values(PAYMENT_PERMISSIONS),
    REPORT_PERMISSIONS.READ,
    REPORT_PERMISSIONS.EXPORT,
  ]),
  invoicing_only: new Set([
    INVOICE_PERMISSIONS.READ,
    INVOICE_PERMISSIONS.CREATE,
    INVOICE_PERMISSIONS.UPDATE,
    INVOICE_PERMISSIONS.SEND,
    INVOICE_PERMISSIONS.EXPORT,
    CONTACT_PERMISSIONS.READ,
    PRODUCT_PERMISSIONS.READ,
    PAYMENT_PERMISSIONS.READ,
    PAYMENT_PERMISSIONS.CREATE,
  ]),
  read_only: new Set([
    INVOICE_PERMISSIONS.READ,
    CONTACT_PERMISSIONS.READ,
    PRODUCT_PERMISSIONS.READ,
    PAYMENT_PERMISSIONS.READ,
    REPORT_PERMISSIONS.READ,
  ]),
}
