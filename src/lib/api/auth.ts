import { NextRequest, NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { prisma }          from "@/lib/prisma"
import { checkRateLimit }  from "./rate-limit"
import { getOrgPlan, enforceFeature, PlanLimitError } from "@/lib/plans/guard"
import { PLAN_LABELS } from "@/lib/plans/limits"

export type ApiContext = {
  organizationId: string
  apiKeyId:       string
  scopes:         string[]
  environment:    string
}

type Handler = (req: NextRequest, ctx: ApiContext) => Promise<Response>

export function withApiAuth(requiredScope: string, handler: Handler) {
  return async (req: NextRequest): Promise<Response> => {
    // Extract Bearer token
    const auth = req.headers.get("authorization") ?? ""
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 })
    }
    const rawKey = auth.slice(7).trim()
    if (!rawKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 })
    }

    // Hash and look up
    const keyHash = createHash("sha256").update(rawKey).digest("hex")

    // Fetch by hash — constant-time comparison via DB unique lookup
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id:             true,
        organizationId: true,
        scopes:         true,
        environment:    true,
        rateLimit:      true,
        isActive:       true,
        revokedAt:      true,
        expiresAt:      true,
      },
    })

    if (!apiKey || !apiKey.isActive || apiKey.revokedAt) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 })
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return NextResponse.json({ error: "API key expired" }, { status: 401 })
    }

    // Plan check: api_access feature
    try {
      const plan = await getOrgPlan(apiKey.organizationId)
      enforceFeature(plan, "api_access")
    } catch (e) {
      if (e instanceof PlanLimitError) {
        return NextResponse.json(
          { error: "plan_limit", kind: "feature", feature: "api_access", requiredPlan: e.requiredPlan, requiredPlanLabel: PLAN_LABELS[e.requiredPlan] },
          { status: 402 },
        )
      }
      throw e
    }

    // Scope check
    if (!apiKey.scopes.includes(requiredScope) && !apiKey.scopes.includes("*")) {
      return NextResponse.json({ error: `Insufficient scope — requires ${requiredScope}` }, { status: 403 })
    }

    // Rate limit
    const limit  = apiKey.rateLimit ?? 60
    const rlKey  = `${apiKey.organizationId}:${apiKey.id}`
    const rl     = checkRateLimit(rlKey, limit)

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit":     String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset":     String(Math.ceil(rl.resetAt / 1000)),
            "Retry-After":           String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        },
      )
    }

    // Update lastUsedAt (fire-and-forget — don't block the request)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data:  { lastUsedAt: new Date() },
    }).catch(() => {})

    const ctx: ApiContext = {
      organizationId: apiKey.organizationId,
      apiKeyId:       apiKey.id,
      scopes:         apiKey.scopes,
      environment:    apiKey.environment,
    }

    const response = await handler(req, ctx)

    // Add standard rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit",     String(limit))
    response.headers.set("X-RateLimit-Remaining", String(rl.remaining))
    response.headers.set("X-RateLimit-Reset",     String(Math.ceil(rl.resetAt / 1000)))

    return response
  }
}
