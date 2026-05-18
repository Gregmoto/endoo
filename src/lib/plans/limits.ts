import type { Plan } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────────
// Feature flags — every new feature must be listed here
// ─────────────────────────────────────────────────────────────────────────────

export type PlanFeature =
  | "ai_assistant"
  | "ai_anomaly_detection"
  | "recurring_invoices"
  | "agency_mode"
  | "custom_branding"
  | "advanced_reports"
  | "basic_reports"
  | "sie_export"
  | "vat_periods"
  | "approval_workflows"
  | "dimensions"
  | "multi_currency"
  | "api_access"
  | "webhooks_outgoing"
  | "time_tracking"
  | "project_accounting"
  | "e_signing"
  | "quotes"
  | "inventory"
  | "supplier_invoices"
  | "customer_portal"
  | "fixed_assets"
  | "accruals"

export type PlanLimitKey =
  | "maxUsers"
  | "maxInvoicesPerMonth"
  | "maxContacts"
  | "maxProducts"
  | "maxApiKeys"
  | "maxStorageBytes"

export interface PlanLimits {
  maxUsers: number               // 9999 = unlimited
  maxInvoicesPerMonth: number
  maxContacts: number
  maxProducts: number
  maxApiKeys: number
  maxStorageBytes: number        // bytes
  features: PlanFeature[]
}

// 9999 = effectively unlimited (avoids Infinity for serialization)
const UNLIMITED = 9999

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxUsers:             1,
    maxInvoicesPerMonth:  5,
    maxContacts:          25,
    maxProducts:          20,
    maxApiKeys:           0,
    maxStorageBytes:      50 * 1024 * 1024,  // 50 MB
    features: [
      "basic_reports",
      "quotes",
    ],
  },

  starter: {
    maxUsers:             3,
    maxInvoicesPerMonth:  50,
    maxContacts:          250,
    maxProducts:          100,
    maxApiKeys:           1,
    maxStorageBytes:      1024 * 1024 * 1024,  // 1 GB
    features: [
      "basic_reports",
      "quotes",
      "recurring_invoices",
      "sie_export",
      "vat_periods",
      "e_signing",
      "supplier_invoices",
      "customer_portal",
      "inventory",
      "api_access",
    ],
  },

  pro: {
    maxUsers:             10,
    maxInvoicesPerMonth:  UNLIMITED,
    maxContacts:          UNLIMITED,
    maxProducts:          UNLIMITED,
    maxApiKeys:           5,
    maxStorageBytes:      10 * 1024 * 1024 * 1024,  // 10 GB
    features: [
      "basic_reports",
      "advanced_reports",
      "quotes",
      "recurring_invoices",
      "sie_export",
      "vat_periods",
      "e_signing",
      "supplier_invoices",
      "customer_portal",
      "inventory",
      "api_access",
      "ai_assistant",
      "ai_anomaly_detection",
      "approval_workflows",
      "dimensions",
      "multi_currency",
      "project_accounting",
      "webhooks_outgoing",
      "fixed_assets",
      "accruals",
    ],
  },

  enterprise: {
    maxUsers:             UNLIMITED,
    maxInvoicesPerMonth:  UNLIMITED,
    maxContacts:          UNLIMITED,
    maxProducts:          UNLIMITED,
    maxApiKeys:           UNLIMITED,
    maxStorageBytes:      UNLIMITED * 1024 * 1024,
    features: [
      "basic_reports",
      "advanced_reports",
      "quotes",
      "recurring_invoices",
      "sie_export",
      "vat_periods",
      "e_signing",
      "supplier_invoices",
      "customer_portal",
      "inventory",
      "api_access",
      "ai_assistant",
      "ai_anomaly_detection",
      "approval_workflows",
      "dimensions",
      "multi_currency",
      "project_accounting",
      "webhooks_outgoing",
      "agency_mode",
      "custom_branding",
      "time_tracking",
      "fixed_assets",
      "accruals",
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED
}

/** Returns the cheapest plan that includes this feature. */
export function requiredPlanForFeature(feature: PlanFeature): Plan {
  const order: Plan[] = ["free", "starter", "pro", "enterprise"]
  for (const plan of order) {
    if (PLAN_LIMITS[plan].features.includes(feature)) return plan
  }
  return "enterprise"
}

/** Returns the cheapest plan where the limit is high enough for count. */
export function requiredPlanForLimit(limitKey: PlanLimitKey, count: number): Plan {
  const order: Plan[] = ["free", "starter", "pro", "enterprise"]
  for (const plan of order) {
    if (PLAN_LIMITS[plan][limitKey] > count || isUnlimited(PLAN_LIMITS[plan][limitKey])) {
      return plan
    }
  }
  return "enterprise"
}

export const PLAN_LABELS: Record<Plan, string> = {
  free:       "Gratis",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
}

export const PLAN_PRICES: Record<Plan, string> = {
  free:       "0 kr/mån",
  starter:    "299 kr/mån",
  pro:        "799 kr/mån",
  enterprise: "Kontakta oss",
}
