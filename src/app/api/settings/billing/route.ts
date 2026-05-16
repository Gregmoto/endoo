/**
 * GET /api/settings/billing
 * Returns current plan, subscription status, usage, and limits.
 */

import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { prisma } from "@/lib/prisma"
import { PLAN_LIMITS } from "@/lib/stripe"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:read")

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [org, sub, members, invoicesThisMonth, contacts] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { plan: true, stripeSubscriptionId: true },
      }),
      prisma.subscription.findFirst({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      }),
      prisma.organizationMember.count({
        where: { organizationId: ctx.organizationId, deletedAt: null },
      }),
      prisma.invoice.count({
        where: { organizationId: ctx.organizationId, deletedAt: null, createdAt: { gte: startOfMonth } },
      }),
      prisma.contact.count({
        where: { organizationId: ctx.organizationId, deletedAt: null },
      }),
    ])

    if (!org) return Response.json({ error: "Not found" }, { status: 404 })

    const limits = PLAN_LIMITS[org.plan] ?? PLAN_LIMITS.free

    return Response.json({
      plan:                 org.plan,
      stripeSubscriptionId: org.stripeSubscriptionId,
      sub: sub ? {
        status:            sub.status,
        currentPeriodEnd:  sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      } : null,
      usage: {
        invoices: invoicesThisMonth,
        contacts,
        members,
      },
      limits: {
        maxInvoicesPerMonth: limits.maxInvoicesPerMonth,
        maxContacts:         limits.maxContacts,
        maxUsers:            limits.maxUsers,
      },
    })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Forbidden" }, { status: 403 })
    console.error("[settings/billing]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
