import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"

const Schema = z.object({ reservationId: z.string().uuid() })

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:manual_reservation")
    const { id } = await params

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const reservation = await prisma.manualReservation.findFirst({
      where: { id: parsed.data.reservationId, productId: id, organizationId: ctx.organizationId, cancelledAt: null },
    })
    if (!reservation) {
      return Response.json({ error: "Reservering hittades inte" }, { status: 404 })
    }

    await prisma.manualReservation.update({
      where: { id: parsed.data.reservationId },
      data:  { cancelledAt: new Date() },
    })

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleApiError(err, "articles/[id]/reserve")
  }
}
