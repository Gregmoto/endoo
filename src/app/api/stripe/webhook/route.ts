/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events and keeps organization plan/subscription in sync.
 *
 * Events handled:
 *   checkout.session.completed      — new subscription started
 *   customer.subscription.updated   — plan changed, renewal
 *   customer.subscription.deleted   — subscription cancelled/expired
 *   invoice.payment_failed          — payment failure
 *
 * Security: signature verified with STRIPE_WEBHOOK_SECRET
 */

import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { Plan } from "@prisma/client"
import Stripe from "stripe"
import { resolvePlan } from "@/lib/stripe/plan"

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Missing signature or secret" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === "subscription" && session.customer && session.subscription) {
          await handleSubscriptionStart(
            String(session.customer),
            String(session.subscription),
            session.metadata?.organizationId
          )
        }
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(sub)
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub)
        break
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice
        if (inv.customer) {
          await handlePaymentFailed(String(inv.customer))
        }
        break
      }
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, err)
    return Response.json({ error: "Handler error" }, { status: 500 })
  }

  return Response.json({ received: true })
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSubscriptionStart(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  organizationId?: string
) {
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["items.data.price.product"],
  })

  const plan = resolvePlan(sub)
  const org  = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : await prisma.organization.findUnique({ where: { stripeCustomerId } })

  if (!org) { console.warn("[stripe] org not found for customer", stripeCustomerId); return }

  await prisma.organization.update({
    where: { id: org.id },
    data: { stripeCustomerId, stripeSubscriptionId, plan: plan as Plan },
  })

  await upsertSubscription(org.id, sub, plan)
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  const org = await prisma.organization.findUnique({
    where: { stripeSubscriptionId: sub.id },
  })
  if (!org) return

  const plan = resolvePlan(sub)
  await prisma.organization.update({
    where: { id: org.id },
    data: { plan: plan as any },
  })
  await upsertSubscription(org.id, sub, plan)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const org = await prisma.organization.findUnique({
    where: { stripeSubscriptionId: sub.id },
  })
  if (!org) return

  await prisma.organization.update({
    where: { id: org.id },
    data: { plan: "free", stripeSubscriptionId: null },
  })

  await prisma.subscription.updateMany({
    where: { organizationId: org.id, stripeSubscriptionId: sub.id },
    data:  { status: "cancelled" },
  })
}

async function handlePaymentFailed(stripeCustomerId: string) {
  const org = await prisma.organization.findUnique({ where: { stripeCustomerId } })
  if (!org) return

  await prisma.subscription.updateMany({
    where: { organizationId: org.id, status: "active" },
    data:  { status: "past_due" },
  })

  console.warn(`[stripe] Payment failed for org ${org.id} (${org.name})`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertSubscription(orgId: string, sub: Stripe.Subscription, plan: string) {
  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active:             "active",
    past_due:           "past_due",
    canceled:           "cancelled",
    incomplete:         "incomplete",
    incomplete_expired: "cancelled",
    trialing:           "trialing",
    unpaid:             "past_due",
    paused:             "paused",
  }

  const item             = sub.items.data[0]
  const stripeCustomerId = typeof sub.customer === "string"
    ? sub.customer
    : (sub.customer as Stripe.Customer | null)?.id ?? null

  const shared = {
    plan:                 plan as Plan,
    status:               statusMap[sub.status] ?? "active",
    stripeCustomerId,
    stripeSubscriptionId: sub.id,
    currentPeriodStart:   item?.current_period_start ? new Date(item.current_period_start * 1000) : null,
    currentPeriodEnd:     item?.current_period_end   ? new Date(item.current_period_end   * 1000) : null,
    cancelAtPeriodEnd:    sub.cancel_at_period_end,
  }

  await prisma.subscription.upsert({
    where:  { organizationId: orgId },
    create: { organizationId: orgId, ...shared },
    update: shared,
  })
}
