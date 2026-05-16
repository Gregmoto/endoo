/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for managing subscription,
 * payment methods, and invoices.
 */

import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export async function POST() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:manage_billing")

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { slug: true, stripeCustomerId: true },
    })

    if (!org?.stripeCustomerId) {
      return Response.json({ error: "No Stripe customer — upgrade first" }, { status: 400 })
    }

    const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   org.stripeCustomerId,
      return_url: `${appUrl}/${org.slug}/settings/billing`,
    })

    return Response.json({ url: portalSession.url })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Forbidden" }, { status: 403 })
    console.error("[stripe/portal]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
