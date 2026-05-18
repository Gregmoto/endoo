import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { DELIVERY_METHODS_PERMISSIONS } from "@/lib/rbac/permissions"
import { listItems, createItem } from "@/lib/invoicing/settings-crud"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, DELIVERY_METHODS_PERMISSIONS.READ)
    return Response.json(await listItems("deliveryMethod", ctx))
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, DELIVERY_METHODS_PERMISSIONS.CREATE)
    const body = await req.json()
    const item = await createItem("deliveryMethod", ctx, body)
    return Response.json(item, { status: 201 })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
