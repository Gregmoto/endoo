import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { CURRENCIES_PERMISSIONS } from "@/lib/rbac/permissions"
import { updateItem, deleteItem } from "@/lib/invoicing/settings-crud"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const ctx        = await requireAuth()
    canOrThrow(ctx, CURRENCIES_PERMISSIONS.UPDATE)
    const { id }     = await params
    const body       = await req.json()
    const result     = await updateItem("orgCurrency", ctx, id, body)
    if (!result) return Response.json({ error: "Hittades inte" }, { status: 404 })
    return Response.json(result)
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, CURRENCIES_PERMISSIONS.DELETE)
    const { id } = await params
    const result = await deleteItem("orgCurrency", ctx, id)
    if (!result) return Response.json({ error: "Hittades inte" }, { status: 404 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
