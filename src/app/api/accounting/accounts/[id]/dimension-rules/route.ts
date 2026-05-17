/**
 * GET  /api/accounting/accounts/[id]/dimension-rules  — list rules for account
 * POST /api/accounting/accounts/[id]/dimension-rules  — upsert rule
 * DELETE /api/accounting/accounts/[id]/dimension-rules?axisId=  — remove rule
 */

import { prisma }           from "@/lib/prisma"
import { requireAuth }      from "@/lib/rbac/guards"
import { canOrThrow }       from "@/lib/rbac/policy"
import {
  setAccountDimensionRule,
  removeAccountDimensionRule,
  getAccountDimensionRules,
} from "@/services/accounting/dimension-rules"
import { z } from "zod"

const UpsertSchema = z.object({
  axisId:     z.string().uuid(),
  isRequired: z.boolean().default(true),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:read")
    const { id } = await params

    // Verify account belongs to org
    const account = await prisma.account.findFirst({ where: { id, organizationId: ctx.organizationId } })
    if (!account) return Response.json({ error: "Konto hittades ej" }, { status: 404 })

    const rules = await getAccountDimensionRules(ctx.organizationId, id)
    return Response.json(rules)
  } catch (err) { return handleError(err) }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const { id } = await params
    const body   = await req.json()
    const parsed = UpsertSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })

    const rule = await setAccountDimensionRule(ctx.organizationId, id, parsed.data.axisId, parsed.data.isRequired)
    return Response.json(rule, { status: 201 })
  } catch (err) { return handleError(err) }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:manage_accounts")
    const { id } = await params
    const axisId = new URL(req.url).searchParams.get("axisId")
    if (!axisId) return Response.json({ error: "axisId krävs" }, { status: 400 })

    await removeAccountDimensionRule(ctx.organizationId, id, axisId)
    return new Response(null, { status: 204 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[dimension-rules]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
