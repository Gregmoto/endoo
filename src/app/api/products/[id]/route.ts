/**
 * GET    /api/products/[id]  — product detail
 * PATCH  /api/products/[id]  — update
 * DELETE /api/products/[id]  — soft delete
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")
    const { id } = await params

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })

    if (!product) return Response.json({ error: "Produkt hittades ej" }, { status: 404 })
    return Response.json(product)
  } catch (err) {
    return handleError(err)
  }
}

const PatchSchema = z.object({
  name:        z.string().min(1).max(255).optional(),
  type:        z.enum(["product", "service"]).optional(),
  isActive:    z.boolean().optional(),
  sku:         z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  unitPrice:   z.number().int().min(0).optional(),
  taxRate:     z.number().min(0).max(1).optional(),
  unit:        z.string().max(30).optional(),
  category:    z.string().max(100).optional().nullable(),
  currency:    z.string().max(3).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:update")
    const { id } = await params

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Produkt hittades ej" }, { status: 404 })

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const { unitPrice, ...rest } = parsed.data
    const updated = await prisma.product.update({
      where: { id, organizationId: ctx.organizationId },
      data: {
        ...rest,
        ...(unitPrice !== undefined ? { unitPrice: BigInt(unitPrice) } : {}),
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Product",
        entityId:       id,
        before:         { name: existing.name, unitPrice: existing.unitPrice.toString(), isActive: existing.isActive },
        after:          { name: updated.name,  unitPrice: updated.unitPrice.toString(),  isActive: updated.isActive  },
      },
    }).catch(() => {})

    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:delete")
    const { id } = await params

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Produkt hittades ej" }, { status: 404 })

    await prisma.product.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { deletedAt: new Date() },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "delete",
        entityType:     "Product",
        entityId:       id,
        before:         { name: existing.name, sku: existing.sku },
      },
    }).catch(() => {})

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[products/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
