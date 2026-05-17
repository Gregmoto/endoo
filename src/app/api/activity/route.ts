/**
 * GET /api/activity — org-wide activity feed
 *
 * Query params:
 *   limit      (default 30, max 100)
 *   cursor     (activityFeedItem id for cursor pagination)
 *   category   (optional category filter)
 *   entityType (optional entity type filter)
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { Prisma } from "@prisma/client"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[activity]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function GET(req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()

    const url = new URL(req.url)
    const limitParam = parseInt(url.searchParams.get("limit") ?? "30")
    const limit = Math.min(Math.max(1, limitParam), 100)
    const cursor = url.searchParams.get("cursor")
    const category = url.searchParams.get("category")
    const entityType = url.searchParams.get("entityType")

    const where: Prisma.ActivityFeedItemWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(entityType ? { entityType } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    }

    const items = await prisma.activityFeedItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    })

    const hasMore = items.length > limit
    const page = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

    return Response.json({ items: page, nextCursor })
  } catch (err) {
    return handleError(err)
  }
}
