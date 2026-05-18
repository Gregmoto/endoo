import { requireAuth } from "@/lib/rbac/guards"
import { handleApiError } from "@/lib/api/handle-error"
import { getOrgPlan, getUsage } from "@/lib/plans/guard"
import { PLAN_LIMITS, PLAN_LABELS, PLAN_PRICES, isUnlimited } from "@/lib/plans/limits"

export async function GET() {
  try {
    const ctx  = await requireAuth()
    const plan = await getOrgPlan(ctx.organizationId)
    const usage = await getUsage(ctx.organizationId)
    const limits = PLAN_LIMITS[plan]

    return Response.json({
      plan,
      planLabel: PLAN_LABELS[plan],
      planPrice: PLAN_PRICES[plan],
      features: limits.features,
      limits: {
        maxUsers:            limits.maxUsers,
        maxInvoicesPerMonth: limits.maxInvoicesPerMonth,
        maxContacts:         limits.maxContacts,
        maxProducts:         limits.maxProducts,
        maxApiKeys:          limits.maxApiKeys,
        maxStorageBytes:     limits.maxStorageBytes,
      },
      usage: {
        users:             usage.users,
        invoicesThisMonth: usage.invoicesThisMonth,
        contacts:          usage.contacts,
        products:          usage.products,
        apiKeys:           usage.apiKeys,
      },
      // Pre-computed percentages for UI
      usagePct: {
        users:             isUnlimited(limits.maxUsers)            ? 0 : Math.min(100, Math.round((usage.users / limits.maxUsers) * 100)),
        invoicesThisMonth: isUnlimited(limits.maxInvoicesPerMonth) ? 0 : Math.min(100, Math.round((usage.invoicesThisMonth / limits.maxInvoicesPerMonth) * 100)),
        contacts:          isUnlimited(limits.maxContacts)         ? 0 : Math.min(100, Math.round((usage.contacts / limits.maxContacts) * 100)),
        products:          isUnlimited(limits.maxProducts)         ? 0 : Math.min(100, Math.round((usage.products / limits.maxProducts) * 100)),
        apiKeys:           isUnlimited(limits.maxApiKeys)          ? 0 : Math.min(100, Math.round((usage.apiKeys / limits.maxApiKeys) * 100)),
      },
    })
  } catch (err) {
    return handleApiError(err, "plans/current")
  }
}
