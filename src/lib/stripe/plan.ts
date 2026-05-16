import Stripe from "stripe"

export function resolvePlan(sub: Stripe.Subscription): string {
  const item = sub.items.data[0]
  const product = item?.price?.product
  const productName = typeof product === "object" && product !== null
    ? (product as Stripe.Product).name?.toLowerCase()
    : ""
  if (productName?.includes("enterprise")) return "enterprise"
  if (productName?.includes("pro"))        return "pro"
  if (productName?.includes("starter"))    return "starter"
  return "free"
}
