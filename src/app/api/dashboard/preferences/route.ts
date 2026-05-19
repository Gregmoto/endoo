import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    const prefs = await prisma.userDashboardPreferences.findUnique({
      where: { userId_organizationId: { userId: ctx.userId, organizationId: ctx.organizationId } },
    })
    return Response.json({ hiddenWidgets: prefs?.hiddenWidgets ?? [] })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx  = await requireAuth()
    const { hiddenWidgets } = await req.json()
    await prisma.userDashboardPreferences.upsert({
      where: { userId_organizationId: { userId: ctx.userId, organizationId: ctx.organizationId } },
      create: { userId: ctx.userId, organizationId: ctx.organizationId, hiddenWidgets },
      update: { hiddenWidgets },
    })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
