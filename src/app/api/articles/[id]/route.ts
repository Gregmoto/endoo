import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { ProductType } from "@prisma/client"
import { z } from "zod"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")
    const { id } = await params

    const article = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        inventoryItem: true,
        priceListItems: {
          include: { priceList: { select: { id: true, name: true, currency: true } } },
        },
        manualReservations: {
          where: { cancelledAt: null },
        },
      },
    })

    if (!article) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    return Response.json(article)
  } catch (err) {
    return handleApiError(err, "articles/[id]")
  }
}

const UpdateSchema = z.object({
  name:                   z.string().min(1).max(255).optional(),
  sku:                    z.string().max(50).optional().nullable(),
  description:            z.string().max(2000).optional().nullable(),
  type:                   z.enum(["product", "service"]).optional(),
  isActive:               z.boolean().optional(),
  isStockItem:            z.boolean().optional(),
  isPhasingOut:           z.boolean().optional(),
  unitPrice:              z.number().int().min(0).optional(),
  currency:               z.string().max(3).optional(),
  vatType:                z.string().max(50).optional().nullable(),
  salesAccount:           z.string().max(20).optional().nullable(),
  purchaseAccount:        z.string().max(20).optional().nullable(),
  purchasePrice:          z.number().int().min(0).optional().nullable(),
  ean:                    z.string().max(20).optional().nullable(),
  manufacturer:           z.string().max(100).optional().nullable(),
  manufacturerSku:        z.string().max(100).optional().nullable(),
  notes:                  z.string().max(5000).optional().nullable(),
  warehouseLocation:      z.string().max(100).optional().nullable(),
  width:                  z.number().int().optional().nullable(),
  height:                 z.number().int().optional().nullable(),
  depth:                  z.number().int().optional().nullable(),
  weightGrams:            z.number().int().optional().nullable(),
  inventoryAccount:       z.string().max(20).optional().nullable(),
  inventoryChangeAccount: z.string().max(20).optional().nullable(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:update")
    const { id } = await params

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    if (data.sku && data.sku !== existing.sku) {
      const taken = await prisma.product.findFirst({
        where: { organizationId: ctx.organizationId, sku: data.sku, id: { not: id } },
      })
      if (taken) {
        return Response.json({ error: "Artikelnummer används redan" }, { status: 409 })
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(data.unitPrice    != null ? { unitPrice:    BigInt(data.unitPrice) }    : {}),
        ...(data.purchasePrice != null ? { purchasePrice: BigInt(data.purchasePrice) } : {}),
        ...(data.type ? { type: data.type as ProductType } : {}),
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Product",
        entityId:       id,
        after:          JSON.parse(JSON.stringify(data)),
      },
    }).catch(() => {})

    return Response.json(updated)
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json({ error: "Artikelnummer används redan" }, { status: 409 })
    }
    return handleApiError(err, "articles/[id]")
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:delete")
    const { id } = await params

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    await prisma.product.update({
      where: { id },
      data:  { deletedAt: new Date() },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "delete",
        entityType:     "Product",
        entityId:       id,
      },
    }).catch(() => {})

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleApiError(err, "articles/[id]")
  }
}
