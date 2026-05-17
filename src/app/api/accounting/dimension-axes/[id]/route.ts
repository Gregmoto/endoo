/**
 * PATCH  /api/accounting/dimension-axes/[id]  — update axis
 * DELETE /api/accounting/dimension-axes/[id]  — delete custom axis
 */

import { requireAuth }                                from "@/lib/rbac/guards"
import { canOrThrow }                                 from "@/lib/rbac/policy"
import { updateAxis, deleteAxis, DimensionAxisBuiltInError, DimensionAxisNotFoundError } from "@/services/accounting/dimensions"
import { z } from "zod"

const PatchSchema = z.object({
  name:       z.string().min(1).max(100).optional(),
  isRequired: z.boolean().optional(),
  isActive:   z.boolean().optional(),
  sortOrder:  z.number().int().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const { id } = await params
    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })

    const axis = await updateAxis(ctx.organizationId, id, parsed.data)
    return Response.json(axis)
  } catch (err) { return handleError(err) }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const { id } = await params
    await deleteAxis(ctx.organizationId, id)
    return new Response(null, { status: 204 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (err instanceof DimensionAxisNotFoundError) return Response.json({ error: "Axel hittades ej" }, { status: 404 })
  if (err instanceof DimensionAxisBuiltInError)  return Response.json({ error: "Inbyggda axlar kan inte tas bort" }, { status: 422 })
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[dimension-axes/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
