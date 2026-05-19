import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"

const BulkUpdateSchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(500),
  operation:  z.string(),
  parameters: z.record(z.string(), z.unknown()).default({}),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:bulk_update")

    const body   = await req.json()
    const parsed = BulkUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { articleIds, operation, parameters } = parsed.data

    const existing = await prisma.product.findMany({
      where: { id: { in: articleIds }, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true, unitPrice: true },
    })

    if (existing.length === 0) {
      return Response.json({ updated: 0, errors: [] })
    }

    const ids = existing.map(p => p.id)

    await prisma.$transaction(async (tx) => {
      if (operation === "price_increase" || operation === "price_decrease") {
        const percent = Number(parameters.percent ?? 0)
        const factor  = operation === "price_increase" ? (1 + percent / 100) : (1 - percent / 100)
        for (const p of existing) {
          const newPrice = BigInt(Math.round(Number(p.unitPrice) * factor))
          await tx.product.update({ where: { id: p.id }, data: { unitPrice: newPrice } })
        }
      } else if (operation === "price_set") {
        const priceOre = BigInt(Number(parameters.priceOre ?? 0))
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data:  { unitPrice: priceOre },
        })
      } else if (operation === "price_round") {
        const roundTo = Number(parameters.roundTo ?? 1) * 100
        for (const p of existing) {
          const newPrice = BigInt(Math.round(Number(p.unitPrice) / roundTo) * roundTo)
          await tx.product.update({ where: { id: p.id }, data: { unitPrice: newPrice } })
        }
      } else if (operation === "set_vat_type") {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data:  { vatType: String(parameters.vatType ?? "") },
        })
      } else if (operation === "set_sales_account") {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data:  { salesAccount: String(parameters.salesAccount ?? "") },
        })
      } else if (operation === "set_is_phasing_out") {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data:  { isPhasingOut: Boolean(parameters.value) },
        })
      } else if (operation === "set_is_stock_item") {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data:  { isStockItem: Boolean(parameters.value) },
        })
      } else if (operation === "activate") {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data:  { isActive: true },
        })
      } else if (operation === "deactivate") {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data:  { isActive: false },
        })
      } else {
        throw new Error(`Okänd operation: ${operation}`)
      }
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Product",
        entityId:       ids[0],
        after:          JSON.parse(JSON.stringify({ bulkOperation: operation, articleIds: ids, parameters })),
      },
    }).catch(() => {})

    return Response.json({ updated: ids.length, errors: [] })
  } catch (err) {
    return handleApiError(err, "articles/bulk-update")
  }
}
