import { NextRequest }    from "next/server"
import { requireAuth }    from "@/lib/rbac/guards"
import { prisma }         from "@/lib/prisma"
import { computeAnalyticsSnapshot } from "@/lib/analytics/compute"
import { queryTrend }     from "@/lib/analytics/queries"
import { todayDate }      from "@/lib/analytics/queries"

function ser(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_, val) =>
    typeof val === "bigint" ? Number(val) : val,
  ))
}

function isRecent(d: Date, maxMinutes: number): boolean {
  return (Date.now() - d.getTime()) < maxMinutes * 60_000
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuth()
    const { organizationId } = ctx

    // Serve from snapshot if fresh (< 60 min)
    let snapshot = await prisma.analyticsSnapshot.findUnique({
      where: { organizationId_date: { organizationId, date: todayDate() } },
    })

    if (!snapshot || !isRecent(snapshot.computedAt, 60)) {
      await computeAnalyticsSnapshot(organizationId)
      snapshot = await prisma.analyticsSnapshot.findUnique({
        where: { organizationId_date: { organizationId, date: todayDate() } },
      })
    }

    const trend = await queryTrend(organizationId, 12)

    return Response.json(ser({ snapshot, trend }))
  } catch (err) {
    if (err instanceof Error && err.message.includes("Not authenticated")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[analytics/dashboard]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
