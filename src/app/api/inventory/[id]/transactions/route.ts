import { NextRequest }           from "next/server"
import { requireAuth }           from "@/lib/rbac/guards"
import { canOrThrow }            from "@/lib/rbac/policy"
import { INVENTORY_PERMISSIONS } from "@/lib/rbac/permissions"
import { createTransaction }     from "@/services/inventory/transactions"
import { z }                     from "zod"

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  type:         z.enum(["purchase", "sale", "return_in", "return_out", "adjustment"]),
  quantity:     z.number().refine(n => n !== 0, "Quantity cannot be zero"),
  unitCost:     z.number().nonnegative(),    // SEK
  memo:         z.string().max(500).optional(),
  sourceType:   z.string().max(50).optional(),
  sourceId:     z.string().uuid().optional(),
  transactedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const serial = (v: unknown) =>
  JSON.parse(JSON.stringify(v, (_, x) =>
    typeof x === "bigint" ? x.toString()
    : x instanceof Date   ? x.toISOString()
    : x
  ))

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, INVENTORY_PERMISSIONS.WRITE)
    const { id } = await params

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 })
    }

    const tx = await createTransaction({
      organizationId: ctx.organizationId,
      itemId:         id,
      createdByUserId: ctx.userId,
      ...parsed.data,
    })

    return Response.json(serial({ transaction: tx }), { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === "Inventory item not found") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },   { status: 403 })
  }
  console.error("[inventory/transactions]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
