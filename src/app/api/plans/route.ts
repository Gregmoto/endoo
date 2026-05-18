import { PLAN_LIMITS, PLAN_LABELS, PLAN_PRICES } from "@/lib/plans/limits"
import type { Plan } from "@prisma/client"

export async function GET() {
  const plans = (["free", "starter", "pro", "enterprise"] as Plan[]).map((plan) => ({
    id: plan,
    name: PLAN_LABELS[plan],
    price: PLAN_PRICES[plan],
    limits: {
      maxUsers:             PLAN_LIMITS[plan].maxUsers,
      maxInvoicesPerMonth:  PLAN_LIMITS[plan].maxInvoicesPerMonth,
      maxContacts:          PLAN_LIMITS[plan].maxContacts,
      maxProducts:          PLAN_LIMITS[plan].maxProducts,
      maxApiKeys:           PLAN_LIMITS[plan].maxApiKeys,
    },
    features: PLAN_LIMITS[plan].features,
  }))

  return Response.json({ plans })
}
