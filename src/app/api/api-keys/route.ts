import { NextRequest, NextResponse }  from "next/server"
import { requireAuth }                from "@/lib/rbac/guards"
import { prisma }                     from "@/lib/prisma"
import { getOrgPlan, enforceFeature, enforceLimit } from "@/lib/plans/guard"
import { handleApiError }             from "@/lib/api/handle-error"
import { createHash, randomBytes }    from "crypto"
import { z }                          from "zod"

// GET /api/api-keys — list keys for the current org
export async function GET() {
  try {
    const ctx = await requireAuth()

    const keys = await prisma.apiKey.findMany({
      where:   { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id:          true,
        name:        true,
        keyPrefix:   true,
        scopes:      true,
        environment: true,
        rateLimit:   true,
        isActive:    true,
        revokedAt:   true,
        expiresAt:   true,
        lastUsedAt:  true,
        createdAt:   true,
      },
    })

    return NextResponse.json({ keys })
  } catch (err) {
    return handleApiError(err, "api-keys") as NextResponse
  }
}

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  scopes:      z.array(z.string()).min(1),
  environment: z.enum(["live", "test"]).default("live"),
  expiresAt:   z.string().datetime().optional(),
  rateLimit:   z.number().int().min(1).max(1000).optional(),
})

// POST /api/api-keys — create new key
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()

    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { name, scopes, environment, expiresAt, rateLimit } = parsed.data

    // Plan checks: api_access feature + maxApiKeys limit
    const plan = await getOrgPlan(ctx.organizationId)
    enforceFeature(plan, "api_access")
    const keyCount = await prisma.apiKey.count({ where: { organizationId: ctx.organizationId, isActive: true, revokedAt: null } })
    enforceLimit(plan, "maxApiKeys", keyCount)

    // Generate key: env_prefix + 32 random bytes hex
    const prefix    = environment === "test" ? "endo_test_" : "endo_live_"
    const rawSuffix = randomBytes(32).toString("hex")
    const rawKey    = `${prefix}${rawSuffix}`
    const keyPrefix = rawKey.slice(0, 16)
    const keyHash   = createHash("sha256").update(rawKey).digest("hex")

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: ctx.organizationId,
        name,
        keyPrefix,
        keyHash,
        scopes,
        environment:     environment as never,
        expiresAt:       expiresAt ? new Date(expiresAt) : undefined,
        rateLimit,
        createdByUserId: ctx.userId,
      },
      select: {
        id:          true,
        name:        true,
        keyPrefix:   true,
        scopes:      true,
        environment: true,
        expiresAt:   true,
        createdAt:   true,
      },
    })

    // rawKey returned ONCE — never stored, never retrievable again
    return NextResponse.json({ ...apiKey, key: rawKey }, { status: 201 })
  } catch (err) {
    return handleApiError(err, "api-keys") as NextResponse
  }
}
