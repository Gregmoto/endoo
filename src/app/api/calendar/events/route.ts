import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { CALENDAR_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, CALENDAR_PERMISSIONS.READ)
    const from = req.nextUrl.searchParams.get("from")
    const to   = req.nextUrl.searchParams.get("to")
    const orgId = ctx.organizationId
    const userId = ctx.userId

    const events = await prisma.calendarEvent.findMany({
      where: {
        organizationId: orgId,
        ...(from || to ? {
          startAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
        OR: [
          { shareWithAll: true },
          { creatorId: userId },
          { attendees: { some: { userId } } },
        ],
      },
      include: {
        attendees: { include: { user: { select: { id: true, fullName: true } } } },
        creator: { select: { id: true, fullName: true } },
      },
      orderBy: { startAt: "asc" },
    })

    return Response.json({ events })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, CALENDAR_PERMISSIONS.CREATE)
    const body = await req.json()
    const { title, description, startAt, endAt, allDay, location, color, shareWithAll, attendeeIds } = body

    const event = await prisma.calendarEvent.create({
      data: {
        organizationId: ctx.organizationId,
        creatorId: ctx.userId,
        title,
        description: description || null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        allDay: !!allDay,
        location: location || null,
        color: color || null,
        shareWithAll: !!shareWithAll,
        attendees: attendeeIds?.length ? {
          create: (attendeeIds as string[]).map((userId: string) => ({ userId, status: "invited" })),
        } : undefined,
      },
      include: { attendees: true, creator: { select: { id: true, fullName: true } } },
    })

    return Response.json(event, { status: 201 })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
