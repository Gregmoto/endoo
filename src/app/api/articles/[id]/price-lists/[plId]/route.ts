import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"

const UpdateSchema = z.object({
  priceOre: z.number().int().min(0),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; plId: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:update")
    const { id, plId } = await params

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!product) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    const priceList = await prisma.priceList.findFirst({
      where: { id: plId, organizationId: ctx.organizationId },
    })
    if (!priceList) {
      return Response.json({ error: "Prislista hittades inte" }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const item = await prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: plId, productId: id } },
      create: { priceListId: plId, productId: id, price: BigInt(parsed.data.priceOre) },
      update: { price: BigInt(parsed.data.priceOre) },
    })

    return Response.json(item)
  } catch (err) {
    return handleApiError(err, "articles/[id]/price-lists/[plId]")
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; plId: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:update")
    const { id, plId } = await params

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!product) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    await prisma.priceListItem.deleteMany({
      where: { priceListId: plId, productId: id },
    })

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleApiError(err, "articles/[id]/price-lists/[plId]")
  }
}
