/**
 * POST /api/accounting/accruals/[id]/reverse
 *
 * Voids all posted period journals and marks the accrual as reversed.
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCRUAL_PERMISSIONS } from "@/lib/rbac/permissions"
import { reverseAccrual } from "@/lib/accounting/accruals/post"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCRUAL_PERMISSIONS.REVERSE)
    const { id } = await params

    await reverseAccrual(ctx.organizationId, id, ctx.userId)
    return Response.json({ ok: true })
  } catch (err) {
    const name = (err as { name?: string }).name
    if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    if (name === "NotFoundError")        return Response.json({ error: "Periodiseringen hittades ej" }, { status: 404 })
    if (name === "ValidationError")      return Response.json({ error: (err as Error).message }, { status: 422 })
    console.error("[accruals/reverse]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
