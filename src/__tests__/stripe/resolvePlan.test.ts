import { describe, it, expect } from "vitest"
import { resolvePlan } from "@/lib/stripe/plan"
import type Stripe from "stripe"

function makeSub(productName: string | null): Stripe.Subscription {
  return {
    id: "sub_test",
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: productName !== null
        ? [{
            id: "si_test",
            price: {
              id: "price_test",
              product: { id: "prod_test", name: productName, object: "product" } as Stripe.Product,
            } as Stripe.Price,
          }] as Stripe.SubscriptionItem[]
        : [],
    },
  } as unknown as Stripe.Subscription
}

describe("resolvePlan()", () => {
  it("returns 'enterprise' when product name contains 'enterprise'", () => {
    expect(resolvePlan(makeSub("Endoo Enterprise"))).toBe("enterprise")
    expect(resolvePlan(makeSub("enterprise plan"))).toBe("enterprise")
  })

  it("returns 'pro' when product name contains 'pro'", () => {
    expect(resolvePlan(makeSub("Endoo Pro"))).toBe("pro")
    expect(resolvePlan(makeSub("pro monthly"))).toBe("pro")
  })

  it("returns 'starter' when product name contains 'starter'", () => {
    expect(resolvePlan(makeSub("Endoo Starter"))).toBe("starter")
    expect(resolvePlan(makeSub("starter plan"))).toBe("starter")
  })

  it("returns 'free' when product name matches nothing", () => {
    expect(resolvePlan(makeSub("Unknown Plan"))).toBe("free")
    expect(resolvePlan(makeSub(""))).toBe("free")
  })

  it("returns 'free' when there are no subscription items", () => {
    expect(resolvePlan(makeSub(null))).toBe("free")
  })

  it("returns 'free' when product is a string ID (not expanded)", () => {
    const sub = {
      id: "sub_test",
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [{
          id: "si_test",
          price: { id: "price_test", product: "prod_unexpanded" } as Stripe.Price,
        }] as Stripe.SubscriptionItem[],
      },
    } as unknown as Stripe.Subscription
    expect(resolvePlan(sub)).toBe("free")
  })

  it("enterprise takes priority over pro if both in name", () => {
    // 'enterprise' check comes first in the function
    expect(resolvePlan(makeSub("enterprise pro plan"))).toBe("enterprise")
  })
})
