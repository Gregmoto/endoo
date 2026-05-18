import { prisma } from "@/lib/prisma"
import type { Plan } from "@prisma/client"
import {
  PLAN_LIMITS,
  isUnlimited,
  requiredPlanForFeature,
  requiredPlanForLimit,
  PLAN_LABELS,
  type PlanFeature,
  type PlanLimitKey,
} from "./limits"

// ─────────────────────────────────────────────────────────────────────────────
// Error
// ─────────────────────────────────────────────────────────────────────────────

export class PlanLimitError extends Error {
  readonly kind: "feature" | "limit"
  readonly feature?: PlanFeature
  readonly limitKey?: PlanLimitKey
  readonly current?: number
  readonly max?: number
  readonly currentPlan: Plan
  readonly requiredPlan: Plan

  constructor(opts: {
    kind: "feature" | "limit"
    feature?: PlanFeature
    limitKey?: PlanLimitKey
    current?: number
    max?: number
    currentPlan: Plan
    requiredPlan: Plan
  }) {
    super(
      opts.kind === "feature"
        ? `Feature "${opts.feature}" requires the ${PLAN_LABELS[opts.requiredPlan]} plan`
        : `Limit "${opts.limitKey}" exceeded (${opts.current}/${opts.max})`
    )
    this.name = "PlanLimitError"
    this.kind = opts.kind
    this.feature = opts.feature
    this.limitKey = opts.limitKey
    this.current = opts.current
    this.max = opts.max
    this.currentPlan = opts.currentPlan
    this.requiredPlan = opts.requiredPlan
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan lookup — cached lightly per request (not persistent cache)
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrgPlan(orgId: string): Promise<Plan> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  })
  return org?.plan ?? "free"
}

// ─────────────────────────────────────────────────────────────────────────────
// Synchronous checks (call after fetching plan with getOrgPlan)
// ─────────────────────────────────────────────────────────────────────────────

/** Throws PlanLimitError if the plan doesn't include this feature. */
export function enforceFeature(plan: Plan, feature: PlanFeature): void {
  if (!PLAN_LIMITS[plan].features.includes(feature)) {
    throw new PlanLimitError({
      kind: "feature",
      feature,
      currentPlan: plan,
      requiredPlan: requiredPlanForFeature(feature),
    })
  }
}

/** Throws PlanLimitError if currentCount >= limit for this plan. */
export function enforceLimit(
  plan: Plan,
  limitKey: PlanLimitKey,
  current: number
): void {
  const max = PLAN_LIMITS[plan][limitKey]
  if (!isUnlimited(max) && current >= max) {
    throw new PlanLimitError({
      kind: "limit",
      limitKey,
      current,
      max,
      currentPlan: plan,
      requiredPlan: requiredPlanForLimit(limitKey, current + 1),
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Async convenience (fetches plan and checks in one call)
// ─────────────────────────────────────────────────────────────────────────────

export async function requireFeature(orgId: string, feature: PlanFeature): Promise<void> {
  const plan = await getOrgPlan(orgId)
  enforceFeature(plan, feature)
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage snapshot (for /api/plans/current and billing page)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgUsage {
  users:             number
  invoicesThisMonth: number
  contacts:          number
  products:          number
  apiKeys:           number
}

export async function getUsage(orgId: string): Promise<OrgUsage> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [users, invoicesThisMonth, contacts, products, apiKeys] = await Promise.all([
    prisma.organizationMember.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.invoice.count({
      where: {
        organizationId: orgId,
        type: "invoice",
        createdAt: { gte: monthStart },
      },
    }),
    prisma.contact.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.product.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.apiKey.count({
      where: { organizationId: orgId, isActive: true, revokedAt: null },
    }),
  ])

  return { users, invoicesThisMonth, contacts, products, apiKeys }
}
