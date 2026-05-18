import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { PRICE_LISTS_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; itemId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const ctx              = await requireAuth()
    canOrThrow(ctx, PRICE_LISTS_PERMISSIONS.UPDATE)
    const { id, itemId }   = await params
    const priceList = await prisma.priceList.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!priceList) return Response.json({ error: "Hittades inte" }, { status: 404 })
    const item = await prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId: id },
    })
    if (!item) return Response.json({ error: "Hittades inte" }, { status: 404 })
    const body    = await req.json()
    const updated = await prisma.priceListItem.update({ where: { id: itemId }, data: body })
    return Response.json(updated)
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx              = await requireAuth()
    canOrThrow(ctx, PRICE_LISTS_PERMISSIONS.UPDATE)
    const { id, itemId }   = await params
    const priceList = await prisma.priceList.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!priceList) return Response.json({ error: "Hittades inte" }, { status: 404 })
    const item = await prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId: id },
    })
    if (!item) return Response.json({ error: "Hittades inte" }, { status: 404 })
    await prisma.priceListItem.delete({ where: { id: itemId } })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
