/**
 * GET /api/integrations/connections/[id]/logs
 *
 * Query params:
 *   limit  default 50
 *   cursor pagination cursor (log id)
 */

import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { prisma }      from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "settings:read")
    const { id } = await params

    // Verify ownership
    const connection = await prisma.connection.findFirst({
      where:  { id, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!connection) return Response.json({ error: "Anslutning hittades ej" }, { status: 404 })

    const url    = new URL(req.url)
    const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200)
    const cursor = url.searchParams.get("cursor") ?? undefined

    const logs = await prisma.integrationLog.findMany({
      where:   { connectionId: id },
      orderBy: { createdAt: "desc" },
      take:    limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = logs.length > limit
    return Response.json({
      logs:      hasMore ? logs.slice(0, limit) : logs,
      nextCursor: hasMore ? logs[limit - 1].id : null,
    })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[connections/logs]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
