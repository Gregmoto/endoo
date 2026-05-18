/**
 * POST /api/depreciation/post
 *
 * Posts depreciation journal entries for all active assets for the given period.
 * Body: { period: "YYYY-MM" }
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { DEPRECIATION_PERMISSIONS } from "@/lib/rbac/permissions"
import { postPeriodDepreciation } from "@/lib/accounting/fixed-assets/depreciation"
import { z } from "zod"

const PostSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "period must be YYYY-MM"),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, DEPRECIATION_PERMISSIONS.POST)

    const body   = await req.json()
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const result = await postPeriodDepreciation(
      ctx.organizationId,
      parsed.data.period,
      ctx.userId,
    )

    return Response.json(result)
  } catch (err) {
    const name = (err as { name?: string }).name
    if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[depreciation/post]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
