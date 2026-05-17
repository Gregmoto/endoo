import { requireAuth }               from "@/lib/rbac/guards"
import { computeAnalyticsSnapshot }  from "@/lib/analytics/compute"
import { prisma }                    from "@/lib/prisma"
import { todayDate }                 from "@/lib/analytics/queries"

function ser(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_, val) =>
    typeof val === "bigint" ? Number(val) : val,
  ))
}

export async function POST(): Promise<Response> {
  try {
    const ctx = await requireAuth()
    await computeAnalyticsSnapshot(ctx.organizationId)
    const snapshot = await prisma.analyticsSnapshot.findUnique({
      where: { organizationId_date: { organizationId: ctx.organizationId, date: todayDate() } },
    })
    return Response.json(ser(snapshot))
  } catch (err) {
    if (err instanceof Error && err.message.includes("Not authenticated")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[analytics/refresh]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
