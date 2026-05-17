import { prisma }                    from "@/lib/prisma"
import { computeAnalyticsSnapshot }  from "@/lib/analytics/compute"

function authorized(req: Request): boolean {
  if (!process.env.CRON_SECRET) return false
  const secret = process.env.CRON_SECRET
  if (req.headers.get("x-cron-secret") === secret) return true
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const orgs = await prisma.organization.findMany({
    where:  { isActive: true, deletedAt: null },
    select: { id: true },
    take:   200,
  })

  let success = 0, failed = 0
  for (const org of orgs) {
    try {
      await computeAnalyticsSnapshot(org.id)
      success++
    } catch (err) {
      failed++
      console.error(`[cron/analytics-snapshot] org ${org.id}:`, err)
    }
  }

  console.log(`[cron/analytics-snapshot] orgs=${orgs.length} success=${success} failed=${failed}`)
  return Response.json({ total: orgs.length, success, failed })
}

export const GET  = handle
export const POST = handle
