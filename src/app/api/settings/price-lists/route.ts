import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { PRICE_LISTS_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, PRICE_LISTS_PERMISSIONS.READ)
    const lists = await prisma.priceList.findMany({
      where:   { organizationId: ctx.organizationId },
      orderBy: [{ createdAt: "asc" }],
      include: { items: { orderBy: { createdAt: "asc" } } },
    })
    return Response.json(lists)
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, PRICE_LISTS_PERMISSIONS.CREATE)
    const body = await req.json()
    const list = await prisma.priceList.create({
      data: { ...body, organizationId: ctx.organizationId },
    })
    return Response.json(list, { status: 201 })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
