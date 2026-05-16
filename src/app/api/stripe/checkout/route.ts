/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for upgrading to a paid plan.
 * Redirects user to Stripe hosted checkout.
 *
 * Body: { plan: "starter" | "pro" | "enterprise" }
 */

import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { prisma } from "@/lib/prisma"
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe"
import { z } from "zod"

const Body = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:manage_billing")

    const body   = await req.json()
    const parsed = Body.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Invalid plan" }, { status: 400 })

    const { plan } = parsed.data
    const priceId  = STRIPE_PRICE_IDS[plan]
    if (!priceId)  return Response.json({ error: `No Stripe price ID configured for plan: ${plan}` }, { status: 400 })

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { id: true, name: true, slug: true, stripeCustomerId: true, plan: true },
    })
    if (!org) return Response.json({ error: "Org not found" }, { status: 404 })

    const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

    let customerId = org.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        name:     org.name,
        metadata: { organizationId: org.id },
      })
      customerId = customer.id
      await prisma.organization.update({
        where: { id: org.id },
        data:  { stripeCustomerId: customerId },
      })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        "subscription",
      line_items:  [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/${org.slug}/settings/billing?success=1`,
      cancel_url:  `${appUrl}/${org.slug}/settings/billing?cancelled=1`,
      metadata:    { organizationId: org.id },
      subscription_data: { metadata: { organizationId: org.id } },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Organization",
        entityId:       ctx.organizationId,
        meta:           { event: "stripe_checkout_started", targetPlan: plan, fromPlan: org.plan },
      },
    }).catch(() => {})

    if (!checkoutSession.url) {
      return Response.json({ error: "Stripe returnerade ingen checkout-URL" }, { status: 500 })
    }

    return Response.json({ url: checkoutSession.url })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Forbidden" }, { status: 403 })
    console.error("[stripe/checkout]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
