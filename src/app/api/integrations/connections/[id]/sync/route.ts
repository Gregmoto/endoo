/**
 * POST /api/integrations/connections/[id]/sync
 *
 * Manually trigger a sync for a connection (runs in background).
 */

import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { prisma }      from "@/lib/prisma"
import { runSync }     from "@/services/integrations/sync-runner"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "settings:update")
    const { id } = await params

    const connection = await prisma.connection.findFirst({
      where:  { id, organizationId: ctx.organizationId },
      select: { id: true, status: true },
    })
    if (!connection) return Response.json({ error: "Anslutning hittades ej" }, { status: 404 })
    if (connection.status !== "active") return Response.json({ error: "Anslutningen är inte aktiv" }, { status: 409 })

    // Fire-and-forget — client polls lastSyncAt
    runSync(id).catch((err) => console.error("[sync/manual]", err))

    return Response.json({ ok: true, message: "Synk startad" })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[connections/sync]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
