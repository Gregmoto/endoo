import { NextRequest }           from "next/server"
import { requireAuth }           from "@/lib/rbac/guards"
import { canOrThrow }            from "@/lib/rbac/policy"
import { INVENTORY_PERMISSIONS } from "@/lib/rbac/permissions"
import { getStockLevel, getTransactionHistory } from "@/services/inventory/stock"

type Params = { params: Promise<{ id: string }> }

const serial = (v: unknown) =>
  JSON.parse(JSON.stringify(v, (_, x) =>
    typeof x === "bigint" ? x.toString()
    : x instanceof Date   ? x.toISOString()
    : x
  ))

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, INVENTORY_PERMISSIONS.READ)
    const { id } = await params

    const [level, history] = await Promise.all([
      getStockLevel(ctx.organizationId, id),
      getTransactionHistory(ctx.organizationId, id),
    ])

    if (!level) return Response.json({ error: "Not found" }, { status: 404 })

    return Response.json(serial({ item: level, transactions: history }))
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },   { status: 403 })
  }
  console.error("[inventory/id]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
