import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")
    const { id } = await params

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!product) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    const items = await prisma.priceListItem.findMany({
      where:   { productId: id },
      include: { priceList: { select: { id: true, name: true, currency: true } } },
      orderBy: { priceList: { name: "asc" } },
    })

    return Response.json({ items })
  } catch (err) {
    return handleApiError(err, "articles/[id]/price-lists")
  }
}

const CreateSchema = z.object({
  priceListId: z.string().uuid(),
  priceOre:   z.number().int().min(0),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:update")
    const { id } = await params

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!product) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const priceList = await prisma.priceList.findFirst({
      where: { id: parsed.data.priceListId, organizationId: ctx.organizationId },
    })
    if (!priceList) {
      return Response.json({ error: "Prislista hittades inte" }, { status: 404 })
    }

    const item = await prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: parsed.data.priceListId, productId: id } },
      create: { priceListId: parsed.data.priceListId, productId: id, price: BigInt(parsed.data.priceOre) },
      update: { price: BigInt(parsed.data.priceOre) },
    })

    return Response.json(item, { status: 201 })
  } catch (err) {
    return handleApiError(err, "articles/[id]/price-lists")
  }
}
