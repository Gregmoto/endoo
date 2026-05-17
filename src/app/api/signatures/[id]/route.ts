/**
 * GET   /api/signatures/[id] — get request with full audit trail
 * PATCH /api/signatures/[id] — cancel a request
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "signatures:read")
    const { id } = await params

    const request = await prisma.signatureRequest.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        signers: {
          orderBy: { signingOrder: "asc" },
        },
        events: {
          orderBy: { createdAt: "asc" },
          include: { signer: { select: { name: true, email: true } } },
        },
        createdBy: { select: { fullName: true, email: true } },
      },
    })

    if (!request) return Response.json({ error: "Hittades ej" }, { status: 404 })
    return Response.json(request)
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "signatures:cancel")
    const { id } = await params

    const body = await req.json().catch(() => ({}))
    const cancelReason: string | null = body.reason ?? null

    const existing = await prisma.signatureRequest.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!existing) return Response.json({ error: "Hittades ej" }, { status: 404 })
    if (!["sent", "partially_signed"].includes(existing.status)) {
      return Response.json({ error: "Kan ej avbryta i nuvarande status" }, { status: 422 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.signatureRequest.update({
        where: { id },
        data:  { status: "cancelled", cancelledAt: new Date(), cancelReason },
      })
      await tx.signatureEvent.create({
        data: {
          signatureRequestId: id,
          eventType: "cancelled",
          meta: { reason: cancelReason, cancelledBy: ctx.userId },
        },
      })
      return u
    })

    return Response.json(updated)
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
