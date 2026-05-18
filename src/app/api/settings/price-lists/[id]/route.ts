import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { PRICE_LISTS_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, PRICE_LISTS_PERMISSIONS.READ)
    const { id } = await params
    const list   = await prisma.priceList.findFirst({
      where:   { id, organizationId: ctx.organizationId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    })
    if (!list) return Response.json({ error: "Hittades inte" }, { status: 404 })
    return Response.json(list)
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, PRICE_LISTS_PERMISSIONS.UPDATE)
    const { id } = await params
    const body   = await req.json()
    const exists = await prisma.priceList.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!exists) return Response.json({ error: "Hittades inte" }, { status: 404 })
    const updated = await prisma.priceList.update({ where: { id }, data: body })
    return Response.json(updated)
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, PRICE_LISTS_PERMISSIONS.DELETE)
    const { id } = await params
    const exists = await prisma.priceList.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!exists) return Response.json({ error: "Hittades inte" }, { status: 404 })
    await prisma.priceList.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
