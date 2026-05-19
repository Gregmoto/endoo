import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { CURRENCIES_PERMISSIONS } from "@/lib/rbac/permissions"
import { listItems, createItem } from "@/lib/invoicing/settings-crud"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, CURRENCIES_PERMISSIONS.READ)
    const active = req.nextUrl.searchParams.get("active")
    if (active === "true") {
      const rows = await prisma.orgCurrency.findMany({
        where:   { organizationId: ctx.organizationId, isActive: true },
        orderBy: [{ isDefault: "desc" }, { code: "asc" }],
      })
      return Response.json(rows)
    }
    return Response.json(await listItems("orgCurrency", ctx))
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, CURRENCIES_PERMISSIONS.CREATE)
    const body = await req.json()
    const item = await createItem("orgCurrency", ctx, body)
    return Response.json(item, { status: 201 })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
