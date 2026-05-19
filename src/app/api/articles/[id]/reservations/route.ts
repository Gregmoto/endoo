import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"

const CreateSchema = z.object({
  quantity:  z.number().positive(),
  reason:    z.string().min(1).max(500),
  notes:     z.string().max(2000).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
})

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

    const reservations = await prisma.manualReservation.findMany({
      where:   { productId: id, organizationId: ctx.organizationId, cancelledAt: null },
      orderBy: { reservedAt: "desc" },
    })

    return Response.json({ reservations })
  } catch (err) {
    return handleApiError(err, "articles/[id]/reservations")
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:manual_reservation")
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

    const { quantity, reason, notes, expiresAt } = parsed.data

    const reservation = await prisma.manualReservation.create({
      data: {
        organizationId: ctx.organizationId,
        productId:      id,
        quantity,
        reason,
        notes,
        reservedById:   ctx.userId,
        expiresAt:      expiresAt ? new Date(expiresAt) : null,
      },
    })

    return Response.json(reservation, { status: 201 })
  } catch (err) {
    return handleApiError(err, "articles/[id]/reservations")
  }
}
