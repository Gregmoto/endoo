import { NextRequest }           from "next/server"
import { requireAuth }           from "@/lib/rbac/guards"
import { canOrThrow }            from "@/lib/rbac/policy"
import { INVENTORY_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }                from "@/lib/prisma"
import { getAllStockLevels }      from "@/services/inventory/stock"
import { z }                     from "zod"

const serial = (v: unknown) =>
  JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)))

const CreateSchema = z.object({
  productId:     z.string().uuid(),
  unitOfMeasure: z.string().max(20).default("st"),
  costMethod:    z.enum(["average", "standard"]).default("average"),
  standardCost:  z.number().nonnegative().optional(),   // SEK
  reorderPoint:  z.number().nonnegative().optional(),
  warehouseNote: z.string().max(500).optional(),
})

export async function GET() {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, INVENTORY_PERMISSIONS.READ)
    const levels = await getAllStockLevels(ctx.organizationId)
    return Response.json(serial({ items: levels }))
  } catch (err) { return handleError(err) }
}

export async function POST(req: NextRequest) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, INVENTORY_PERMISSIONS.MANAGE)

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 })
    }

    const { productId, unitOfMeasure, costMethod, standardCost, reorderPoint, warehouseNote } = parsed.data

    // Verify product belongs to org
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product || product.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    const item = await prisma.inventoryItem.create({
      data: {
        organizationId: ctx.organizationId,
        productId,
        unitOfMeasure,
        costMethod,
        standardCost:   standardCost != null ? BigInt(Math.round(standardCost * 100)) : null,
        reorderPoint:   reorderPoint != null ? reorderPoint : null,
        warehouseNote:  warehouseNote ?? null,
      },
    })
    return Response.json(serial({ item }), { status: 201 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },   { status: 403 })
  }
  console.error("[inventory]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
