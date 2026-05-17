/**
 * PATCH /api/notifications/[id]/read — mark one notification as read
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[notifications/[id]/read]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const ctx = await requireAuth()
    const { id } = await params

    const existing = await prisma.notification.findUnique({
      where: { id },
    })

    if (
      !existing ||
      existing.userId !== ctx.userId ||
      existing.organizationId !== ctx.organizationId
    ) {
      return Response.json({ error: "Hittas inte" }, { status: 404 })
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        readAt: existing.readAt ?? new Date(),
      },
    })

    return Response.json({ notification })
  } catch (err) {
    return handleError(err)
  }
}
