/**
 * POST /api/notifications/read-all — mark all unread notifications as read
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[notifications/read-all]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function POST(_req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()

    const result = await prisma.notification.updateMany({
      where: {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    })

    return Response.json({ updated: result.count })
  } catch (err) {
    return handleError(err)
  }
}
