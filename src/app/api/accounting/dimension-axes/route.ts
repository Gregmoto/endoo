/**
 * GET  /api/accounting/dimension-axes  — list all axes for org
 * POST /api/accounting/dimension-axes  — create custom axis
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { createAxis }  from "@/services/accounting/dimensions"
import { z }           from "zod"

const CreateSchema = z.object({
  code:       z.string().min(1).max(32).regex(/^[a-z0-9_]+$/, "Koden får bara innehålla a-z, 0-9 och _"),
  name:       z.string().min(1).max(100),
  isRequired: z.boolean().optional(),
  sortOrder:  z.number().int().optional(),
})

export async function GET(_req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "accounting:read")

    const axes = await prisma.dimensionAxis.findMany({
      where:   { organizationId: ctx.organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { dimensions: true } } },
    })
    return Response.json(axes)
  } catch (err) { return handleError(err) }
}

export async function POST(req: Request) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })

    const axis = await createAxis(ctx.organizationId, parsed.data)
    return Response.json(axis, { status: 201 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[dimension-axes]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
