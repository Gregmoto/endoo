/** Application-wide constants */

export const APP_NAME = "Endoo"
export const APP_URL = process.env.NEXTAUTH_URL ?? "https://endoo.se"

// ─────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────

export const PLANS = {
  free: {
    label: "Gratis",
    maxInvoicesPerMonth: 5,
    maxUsers: 1,
    maxClients: 10,
    hasPdfBranding: false,
    hasAuditLog: false,
    hasAgencyFeatures: false,
  },
  starter: {
    label: "Starter",
    maxInvoicesPerMonth: 50,
    maxUsers: 3,
    maxClients: 50,
    hasPdfBranding: true,
    hasAuditLog: true,
    hasAgencyFeatures: false,
  },
  pro: {
    label: "Pro",
    maxInvoicesPerMonth: Infinity,
    maxUsers: 10,
    maxClients: Infinity,
    hasPdfBranding: true,
    hasAuditLog: true,
    hasAgencyFeatures: true,
  },
  enterprise: {
    label: "Enterprise",
    maxInvoicesPerMonth: Infinity,
    maxUsers: Infinity,
    maxClients: Infinity,
    hasPdfBranding: true,
    hasAuditLog: true,
    hasAgencyFeatures: true,
  },
} as const

export type PlanKey = keyof typeof PLANS

// ─────────────────────────────────────────────
// Invoice
// ─────────────────────────────────────────────

export const DEFAULT_TAX_RATE = 0.25        // 25% moms
export const DEFAULT_PAYMENT_TERMS = 30     // 30 dagar
export const DEFAULT_CURRENCY = "SEK"
export const DEFAULT_LOCALE = "sv-SE"
export const DEFAULT_COUNTRY = "SE"

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

// ─────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────

/** Invitation expires after 7 days */
export const INVITATION_EXPIRY_DAYS = 7

/** Max login attempts before temporary lockout */
export const MAX_LOGIN_ATTEMPTS = 5
