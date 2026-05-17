/**
 * GET  /api/accounting/dimensions  — list dimensions (filter by axisId, status)
 * POST /api/accounting/dimensions  — create dimension
 */

import { prisma }           from "@/lib/prisma"
import { requireAuth }      from "@/lib/rbac/guards"
import { canOrThrow }       from "@/lib/rbac/policy"
import { createDimension, DimensionAxisNotFoundError } from "@/services/accounting/dimensions"
import { z } from "zod"

const CreateSchema = z.object({
  axisId:      z.string().uuid(),
  code:        z.string().min(1).max(64),
  name:        z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  parentId:    z.string().uuid().optional(),
  budget:      z.number().positive().optional(),  // kr, converted to öre
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerId:     z.string().uuid().optional(),
})

export async function GET(req: Request) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:read")
    const url    = new URL(req.url)
    const axisId = url.searchParams.get("axisId") ?? undefined
    const status = url.searchParams.get("status") ?? undefined
    const q      = url.searchParams.get("q") ?? undefined

    const dims = await prisma.dimension.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(axisId ? { axisId } : {}),
        ...(status ? { status: status as "planning" | "active" | "on_hold" | "completed" | "archived" } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ axis: { sortOrder: "asc" } }, { code: "asc" }],
      include: {
        axis:   { select: { id: true, code: true, name: true } },
        owner:  { select: { id: true, fullName: true, email: true } },
        parent: { select: { id: true, code: true, name: true } },
        _count: { select: { journalEntryDimensions: true } },
      },
    })
    return Response.json(dims)
  } catch (err) { return handleError(err) }
}

export async function POST(req: Request) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })

    const dim = await createDimension(ctx.organizationId, {
      axisId:      parsed.data.axisId,
      code:        parsed.data.code,
      name:        parsed.data.name,
      description: parsed.data.description,
      parentId:    parsed.data.parentId,
      budget:      parsed.data.budget != null ? BigInt(Math.round(parsed.data.budget * 100)) : undefined,
      startDate:   parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate:     parsed.data.endDate   ? new Date(parsed.data.endDate)   : undefined,
      ownerId:     parsed.data.ownerId,
    })
    return Response.json(dim, { status: 201 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (err instanceof DimensionAxisNotFoundError) return Response.json({ error: "Axel hittades ej" }, { status: 404 })
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[dimensions]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
