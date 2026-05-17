/**
 * GET    /api/accounting/dimensions/[id]  — get single dimension
 * PATCH  /api/accounting/dimensions/[id]  — update
 * DELETE /api/accounting/dimensions/[id]  — soft-delete (set inactive)
 */

import { prisma }               from "@/lib/prisma"
import { requireAuth }          from "@/lib/rbac/guards"
import { canOrThrow }           from "@/lib/rbac/policy"
import { updateDimension, DimensionNotFoundError } from "@/services/accounting/dimensions"
import { z } from "zod"

const PatchSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  budget:      z.number().positive().optional().nullable(),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  ownerId:     z.string().uuid().optional().nullable(),
  isActive:    z.boolean().optional(),
  status:      z.enum(["planning", "active", "on_hold", "completed", "archived"]).optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:read")
    const { id } = await params

    const dim = await prisma.dimension.findFirst({
      where:   { id, organizationId: ctx.organizationId },
      include: {
        axis:     { select: { id: true, code: true, name: true } },
        owner:    { select: { id: true, fullName: true, email: true } },
        parent:   { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true, isActive: true } },
        _count:   { select: { journalEntryDimensions: true, invoiceLineDimensions: true } },
      },
    })
    if (!dim) return Response.json({ error: "Dimension hittades ej" }, { status: 404 })
    return Response.json(dim)
  } catch (err) { return handleError(err) }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const { id } = await params
    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })

    const { budget, startDate, endDate, ...rest } = parsed.data
    const dim = await updateDimension(ctx.organizationId, id, {
      ...rest,
      ...(budget    !== undefined ? { budget: budget != null ? BigInt(Math.round(budget * 100)) : null } : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate   !== undefined ? { endDate:   endDate   ? new Date(endDate)   : null } : {}),
    })
    return Response.json(dim)
  } catch (err) { return handleError(err) }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const { id } = await params
    // Soft-delete: set inactive + archived
    const dim = await updateDimension(ctx.organizationId, id, { isActive: false, status: "archived" })
    return Response.json(dim)
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (err instanceof DimensionNotFoundError) return Response.json({ error: "Dimension hittades ej" }, { status: 404 })
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[dimensions/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
