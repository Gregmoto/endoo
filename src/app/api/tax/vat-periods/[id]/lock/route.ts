import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { lockVatPeriod } from "@/services/tax/vat-periods"

function serializeBigInt(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  )
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.MANAGE_PERIODS)

    const { id } = await params

    const updated = await lockVatPeriod(ctx.organizationId, id, ctx.userId)

    return Response.json(serializeBigInt(updated))
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "UnauthenticatedError")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.name === "UnauthorizedError")
        return Response.json({ error: "Forbidden" }, { status: 403 })
      if (err.message === "Not found" || err.message === "Not found after calculation")
        return Response.json({ error: "Hittades inte" }, { status: 404 })
      if (err.message === "Already locked")
        return Response.json({ error: "Perioden är redan låst" }, { status: 409 })
    }
    console.error("[vat-periods/lock POST]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
