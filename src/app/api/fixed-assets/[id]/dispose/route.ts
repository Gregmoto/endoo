/**
 * POST /api/fixed-assets/[id]/dispose
 *
 * Books a disposal journal and marks the asset as disposed.
 * Requires fixed_assets:dispose permission.
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { FIXED_ASSET_PERMISSIONS } from "@/lib/rbac/permissions"
import { disposeAsset } from "@/lib/accounting/fixed-assets/dispose"
import { z } from "zod"

const DisposeSchema = z.object({
  disposalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proceeds:     z.number().int().min(0).default(0),  // öre
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, FIXED_ASSET_PERMISSIONS.DISPOSE)
    const { id } = await params

    const body   = await req.json()
    const parsed = DisposeSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const result = await disposeAsset({
      organizationId:   ctx.organizationId,
      assetId:          id,
      disposalDate:     new Date(parsed.data.disposalDate),
      proceeds:         BigInt(parsed.data.proceeds),
      disposedByUserId: ctx.userId,
    })

    return Response.json({
      journalId: result.journalId,
      gainLoss:  result.gainLoss.toString(),
    })
  } catch (err) {
    const name = (err as { name?: string }).name
    if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    if (name === "NotFoundError")        return Response.json({ error: "Tillgången hittades ej" }, { status: 404 })
    if (name === "ValidationError")      return Response.json({ error: (err as Error).message }, { status: 422 })
    console.error("[fixed-assets/dispose]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
