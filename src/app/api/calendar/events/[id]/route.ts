import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { CALENDAR_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, CALENDAR_PERMISSIONS.READ)
    const { id } = await params
    const event = await prisma.calendarEvent.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { attendees: { include: { user: { select: { id: true, fullName: true } } } }, creator: { select: { id: true, fullName: true } } },
    })
    if (!event) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json(event)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, CALENDAR_PERMISSIONS.UPDATE)
    const { id } = await params
    const event = await prisma.calendarEvent.findFirst({ where: { id, organizationId: ctx.organizationId } })
    if (!event) return Response.json({ error: "Not found" }, { status: 404 })
    const role = ctx.role
    if (event.creatorId !== ctx.userId && role !== "customer_owner" && role !== "customer_admin" && role !== "agency_owner" && role !== "agency_admin" && role !== "super_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    const body = await req.json()
    const { title, description, startAt, endAt, allDay, location, color, shareWithAll, attendeeIds } = body

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        description: description || null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        allDay: !!allDay,
        location: location || null,
        color: color || null,
        shareWithAll: !!shareWithAll,
        attendees: attendeeIds !== undefined ? {
          deleteMany: {},
          create: (attendeeIds as string[]).map((userId: string) => ({ userId, status: "invited" })),
        } : undefined,
      },
      include: { attendees: true },
    })
    return Response.json(updated)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, CALENDAR_PERMISSIONS.DELETE)
    const { id } = await params
    const event = await prisma.calendarEvent.findFirst({ where: { id, organizationId: ctx.organizationId } })
    if (!event) return Response.json({ error: "Not found" }, { status: 404 })
    const role = ctx.role
    if (event.creatorId !== ctx.userId && role !== "customer_owner" && role !== "customer_admin" && role !== "agency_owner" && role !== "agency_admin" && role !== "super_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    await prisma.calendarEvent.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
