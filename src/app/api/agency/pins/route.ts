/**
 * POST /api/agency/pins  — pin a client (toggle)
 * GET  /api/agency/pins  — list pinned client IDs for current member
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId: ctx.userId } },
      select: { id: true },
    })
    if (!member) return Response.json([])

    const pins = await prisma.agencyClientPin.findMany({
      where:   { agencyMemberId: member.id },
      orderBy: { sortOrder: "asc" },
      select:  { clientId: true },
    })

    return Response.json(pins.map(p => p.clientId))
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthenticated")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const { clientId } = await req.json() as { clientId: string }

    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId: ctx.userId } },
      select: { id: true },
    })
    if (!member) return Response.json({ error: "Not a member" }, { status: 403 })

    const existing = await prisma.agencyClientPin.findUnique({
      where: { agencyMemberId_clientId: { agencyMemberId: member.id, clientId } },
    })

    if (existing) {
      await prisma.agencyClientPin.delete({ where: { id: existing.id } })
      return Response.json({ pinned: false })
    } else {
      const count = await prisma.agencyClientPin.count({ where: { agencyMemberId: member.id } })
      await prisma.agencyClientPin.create({
        data: { agencyMemberId: member.id, clientId, sortOrder: count },
      })
      return Response.json({ pinned: true })
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },    { status: 403 })
    }
    console.error("[agency/pins POST]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
