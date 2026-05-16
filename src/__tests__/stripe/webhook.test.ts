import { describe, it, expect } from "vitest"
import type Stripe from "stripe"

// ─── Subscription status mapping ─────────────────────────────────────────────
// Mirrors the statusMap in src/app/api/stripe/webhook/route.ts.
// Tests that every Stripe status is mapped to a valid internal status.

const STATUS_MAP: Record<Stripe.Subscription.Status, string> = {
  active:             "active",
  past_due:           "past_due",
  canceled:           "cancelled",
  incomplete:         "incomplete",
  incomplete_expired: "cancelled",
  trialing:           "trialing",
  unpaid:             "past_due",
  paused:             "paused",
}

const VALID_INTERNAL_STATUSES = ["active", "past_due", "cancelled", "incomplete", "trialing", "paused"]

describe("subscription statusMap", () => {
  it("maps every Stripe status to a known internal status", () => {
    for (const [stripe, internal] of Object.entries(STATUS_MAP)) {
      expect(VALID_INTERNAL_STATUSES).toContain(internal)
      void stripe
    }
  })

  it("active → active", () => {
    expect(STATUS_MAP.active).toBe("active")
  })

  it("past_due → past_due", () => {
    expect(STATUS_MAP.past_due).toBe("past_due")
  })

  it("canceled → cancelled (en-GB spelling in DB)", () => {
    expect(STATUS_MAP.canceled).toBe("cancelled")
  })

  it("incomplete_expired → cancelled", () => {
    expect(STATUS_MAP.incomplete_expired).toBe("cancelled")
  })

  it("unpaid → past_due (treat as collection problem)", () => {
    expect(STATUS_MAP.unpaid).toBe("past_due")
  })

  it("trialing → trialing", () => {
    expect(STATUS_MAP.trialing).toBe("trialing")
  })

  it("paused → paused", () => {
    expect(STATUS_MAP.paused).toBe("paused")
  })
})

// ─── Stripe customer ID extraction ───────────────────────────────────────────
// The webhook handler expands subscription.customer in some flows
// (string ID vs full Customer object).

function extractCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null
  if (typeof customer === "string") return customer
  if (customer.deleted) return null
  return customer.id
}

describe("extractCustomerId()", () => {
  it("returns string as-is", () => {
    expect(extractCustomerId("cus_123")).toBe("cus_123")
  })

  it("returns id from Customer object", () => {
    const customer = { id: "cus_abc", object: "customer", deleted: false } as unknown as Stripe.Customer
    expect(extractCustomerId(customer)).toBe("cus_abc")
  })

  it("returns null for deleted customer", () => {
    const deleted = { id: "cus_del", object: "customer", deleted: true } as unknown as Stripe.DeletedCustomer
    expect(extractCustomerId(deleted)).toBe(null)
  })

  it("returns null for null input", () => {
    expect(extractCustomerId(null)).toBe(null)
  })
})

// ─── Plan subscription period ─────────────────────────────────────────────────

describe("subscription period timestamp conversion", () => {
  it("converts Unix timestamp to Date correctly", () => {
    const unix = 1_700_000_000
    const date = new Date(unix * 1000)
    expect(date.getFullYear()).toBe(2023)
    expect(date instanceof Date).toBe(true)
  })

  it("handles null current_period_start gracefully", () => {
    const ts: number | null = null
    const date = ts ? new Date(ts * 1000) : null
    expect(date).toBeNull()
  })

  it("handles zero timestamp as falsy (no period set)", () => {
    const ts = 0
    const date = ts ? new Date(ts * 1000) : null
    expect(date).toBeNull()
  })
})

// ─── Webhook idempotency key reasoning ───────────────────────────────────────

describe("checkout session completion guard", () => {
  it("only handles subscription mode sessions", () => {
    const modes: Stripe.Checkout.Session["mode"][] = ["subscription", "payment", "setup"]
    const handler = (mode: string, customer: string | null, subscription: string | null) =>
      mode === "subscription" && customer !== null && subscription !== null

    expect(handler("subscription", "cus_1", "sub_1")).toBe(true)
    expect(handler("payment",      "cus_1", null   )).toBe(false)
    expect(handler("setup",        "cus_1", null   )).toBe(false)
    expect(handler("subscription", null,    "sub_1")).toBe(false)
    expect(handler("subscription", "cus_1", null   )).toBe(false)
  })
})
