/**
 * POST /api/agency/clients/[id]  — trigger immediate snapshot refresh for one client
 */
import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { computeClientSnapshot } from "@/services/agency/compute-snapshot"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx      = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")
    const { id: clientId } = await params

    await computeClientSnapshot(ctx.organizationId, clientId)
    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },    { status: 403 })
    }
    console.error("[agency/clients/[id] POST]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
