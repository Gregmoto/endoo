/**
 * DELETE /api/accounting/journals/[id]/entries/[entryId]/dimensions/[jedId]
 * Removes a dimension allocation from a journal entry line.
 */

import { requireAuth }                from "@/lib/rbac/guards"
import { canOrThrow }                 from "@/lib/rbac/policy"
import {
  removeJournalEntryDimension,
  DimensionLockedPeriodError,
} from "@/services/accounting/dimensions"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string; jedId: string }> },
) {
  try {
    const ctx         = await requireAuth()
    canOrThrow(ctx, "accounting:post")
    const { jedId }   = await params
    const force       = new URL(req.url).searchParams.get("force") === "true"
    if (force && ctx.role !== "super_admin") {
      return Response.json({ error: "Force-flaggan kräver super_admin" }, { status: 403 })
    }

    await removeJournalEntryDimension(ctx.organizationId, jedId, ctx.userId, force && ctx.role === "super_admin")
    return new Response(null, { status: 204 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (err instanceof DimensionLockedPeriodError) return Response.json({ error: "Perioden är låst — dimensioner kan inte ändras" }, { status: 422 })
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[entry-dimensions/[jedId]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
