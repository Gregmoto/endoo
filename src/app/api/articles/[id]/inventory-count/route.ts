import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"
import { Decimal } from "@prisma/client/runtime/library"

const Schema = z.object({
  quantity:  z.number().min(0),
  unitCostOre: z.number().int().min(0).optional().default(0),
  memo:      z.string().max(500).optional().nullable(),
  countedAt: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:update")
    const { id } = await params

    const product = await prisma.product.findFirst({
      where:   { id, organizationId: ctx.organizationId, deletedAt: null },
      include: { inventoryItem: true },
    })
    if (!product) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }
    if (!product.inventoryItem) {
      return Response.json({ error: "Artikeln saknar lagerenhet" }, { status: 422 })
    }

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { quantity, unitCostOre, memo, countedAt } = parsed.data
    const newQty   = new Decimal(quantity)
    const currentQty = product.stockQuantity
    const delta    = newQty.minus(currentQty)
    const transactedAt = countedAt ? new Date(countedAt) : new Date()

    await prisma.$transaction(async (tx) => {
      await tx.inventoryTransaction.create({
        data: {
          organizationId:  ctx.organizationId,
          itemId:          product.inventoryItem!.id,
          type:            "count_set",
          quantity:        delta,
          unitCost:        BigInt(unitCostOre),
          totalCost:       BigInt(Math.round(Math.abs(delta.toNumber()) * unitCostOre)),
          sourceType:      "manual",
          memo:            memo ?? `Inventering: ny nivå ${quantity}`,
          transactedAt,
          createdByUserId: ctx.userId,
        },
      })

      await tx.product.update({
        where: { id },
        data: {
          stockQuantity:    newQty,
          availableQuantity: newQty.minus(product.reservedQuantity),
          lastStockUpdateAt: new Date(),
        },
      })
    })

    return Response.json({ ok: true, newQuantity: quantity })
  } catch (err) {
    return handleApiError(err, "articles/[id]/inventory-count")
  }
}
