/**
 * Stripe client (server-side only).
 *
 * Usage:
 *   import { stripe } from "@/lib/stripe"
 *   const session = await stripe.checkout.sessions.create(...)
 *
 * Env:
 *   STRIPE_SECRET_KEY              — from Stripe dashboard
 *   STRIPE_WEBHOOK_SECRET          — from "stripe listen" or dashboard
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — for client-side Stripe.js
 */

import Stripe from "stripe"

// Lazy singleton — only instantiated on first property access so that
// importing this module during build (e.g. for PLAN_LIMITS) does not
// require STRIPE_SECRET_KEY to be present.
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("[stripe] STRIPE_SECRET_KEY not set")
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" })
  }
  return _stripe
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ─── Plan → Stripe price ID mapping ─────────────────────────────────────────
// Set these in env or a config file once you've created products in Stripe.

export const STRIPE_PRICE_IDS: Record<string, string> = {
  starter:    process.env.STRIPE_PRICE_STARTER    ?? "",
  pro:        process.env.STRIPE_PRICE_PRO        ?? "",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? "",
}

export const PLAN_LIMITS: Record<string, {
  maxUsers:    number
  maxContacts: number
  maxInvoicesPerMonth: number
}> = {
  free:       { maxUsers: 1,   maxContacts: 10,   maxInvoicesPerMonth: 5   },
  starter:    { maxUsers: 3,   maxContacts: 100,  maxInvoicesPerMonth: 50  },
  pro:        { maxUsers: 10,  maxContacts: 1000, maxInvoicesPerMonth: 500 },
  enterprise: { maxUsers: 999, maxContacts: 9999, maxInvoicesPerMonth: 9999 },
}
