/**
 * GET    /api/integrations/connections/[id]  — connection detail
 * PATCH  /api/integrations/connections/[id]  — update config/syncInterval
 * DELETE /api/integrations/connections/[id]  — disconnect
 */

import { requireAuth }  from "@/lib/rbac/guards"
import { canOrThrow }   from "@/lib/rbac/policy"
import { prisma }       from "@/lib/prisma"
import { disconnect }   from "@/services/integrations/connection"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx        = await requireAuth()
    canOrThrow(ctx, "settings:read")
    const { id }     = await params

    const connection = await prisma.connection.findFirst({
      where:  { id, organizationId: ctx.organizationId },
      select: {
        id: true, integrationSlug: true, status: true,
        config: true, syncIntervalMin: true,
        lastSyncAt: true, errorCount: true, lastErrorMessage: true, lastErrorAt: true,
        createdAt: true, tokenExpiresAt: true,
      },
    })
    if (!connection) return Response.json({ error: "Anslutning hittades ej" }, { status: 404 })

    return Response.json({ connection })
  } catch (err) { return handleError(err) }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "settings:update")
    const { id } = await params

    const body   = await req.json()
    const data: Record<string, unknown> = {}
    if (body.config          !== undefined) data.config          = body.config
    if (body.syncIntervalMin !== undefined) data.syncIntervalMin = body.syncIntervalMin

    const connection = await prisma.connection.updateMany({
      where: { id, organizationId: ctx.organizationId },
      data,
    })
    if (connection.count === 0) return Response.json({ error: "Anslutning hittades ej" }, { status: 404 })

    return Response.json({ ok: true })
  } catch (err) { return handleError(err) }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "settings:update")
    const { id } = await params

    await disconnect(ctx.organizationId, id, ctx.userId)
    return Response.json({ ok: true })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "ConnectionNotFoundError") return Response.json({ error: "Anslutning hittades ej" }, { status: 404 })
  if (name === "UnauthenticatedError")    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")       return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[integrations/connections/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
