/**
 * GET /api/notifications — paginated in-app inbox for the current user + org
 *
 * Query params:
 *   limit      (default 20, max 50)
 *   cursor     (notification id for cursor pagination)
 *   unreadOnly ("true" to filter unread only)
 *   category   (optional category filter)
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { Prisma } from "@prisma/client"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[notifications]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function GET(req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()

    const url = new URL(req.url)
    const limitParam = parseInt(url.searchParams.get("limit") ?? "20")
    const limit = Math.min(Math.max(1, limitParam), 50)
    const cursor = url.searchParams.get("cursor")
    const unreadOnly = url.searchParams.get("unreadOnly") === "true"
    const category = url.searchParams.get("category")

    const where: Prisma.NotificationWhereInput = {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      dismissedAt: null,
      ...(unreadOnly ? { readAt: null } : {}),
      ...(category ? { category } : {}),
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          ...where,
          ...(cursor ? { id: { lt: cursor } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
      }),
      prisma.notification.count({
        where: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          dismissedAt: null,
          readAt: null,
        },
      }),
    ])

    const hasMore = notifications.length > limit
    const items = hasMore ? notifications.slice(0, limit) : notifications
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null

    return Response.json({ notifications: items, unreadCount, nextCursor })
  } catch (err) {
    return handleError(err)
  }
}
