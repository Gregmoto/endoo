/**
 * GET  /api/accounting/journals/[id]/entries/[entryId]/dimensions  — list allocations
 * POST /api/accounting/journals/[id]/entries/[entryId]/dimensions  — add allocation
 */

import { prisma }                 from "@/lib/prisma"
import { requireAuth }            from "@/lib/rbac/guards"
import { canOrThrow }             from "@/lib/rbac/policy"
import {
  addJournalEntryDimension,
  DimensionNotFoundError,
  DimensionLockedPeriodError,
  DimensionInactiveError,
  DimensionPercentageError,
} from "@/services/accounting/dimensions"
import { z } from "zod"

const AddSchema = z.object({
  dimensionId: z.string().uuid(),
  percentage:  z.number().min(0.0001).max(100),
  force:       z.boolean().optional(),  // super_admin only
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const ctx              = await requireAuth()
    canOrThrow(ctx, "accounting:read")
    const { entryId }      = await params

    const dims = await prisma.journalEntryDimension.findMany({
      where:   { journalEntryId: entryId, organizationId: ctx.organizationId },
      orderBy: { dimension: { axis: { sortOrder: "asc" } } },
      include: { dimension: { include: { axis: { select: { code: true, name: true } } } } },
    })
    return Response.json(dims)
  } catch (err) { return handleError(err) }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const ctx              = await requireAuth()
    canOrThrow(ctx, "accounting:post")
    const { entryId }      = await params

    const force = (await req.clone().json().catch(() => ({}))).force === true
    if (force && ctx.role !== "super_admin") {
      return Response.json({ error: "Force-flaggan kräver super_admin" }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = AddSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })

    const jed = await addJournalEntryDimension(
      ctx.organizationId,
      entryId,
      parsed.data.dimensionId,
      parsed.data.percentage,
      ctx.userId,
      parsed.data.force && ctx.role === "super_admin",
    )
    return Response.json(jed, { status: 201 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (err instanceof DimensionNotFoundError)    return Response.json({ error: "Dimension hittades ej" }, { status: 404 })
  if (err instanceof DimensionLockedPeriodError) return Response.json({ error: "Perioden är låst — dimensioner kan inte ändras" }, { status: 422 })
  if (err instanceof DimensionInactiveError)    return Response.json({ error: (err as Error).message }, { status: 422 })
  if (err instanceof DimensionPercentageError)  return Response.json({ error: (err as Error).message }, { status: 422 })
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[entry-dimensions]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
