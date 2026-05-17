import { prisma }                 from "@/lib/prisma"
import { computeMonthlyMetric }  from "@/lib/analytics/compute"

function authorized(req: Request): boolean {
  if (!process.env.CRON_SECRET) return false
  const secret = process.env.CRON_SECRET
  if (req.headers.get("x-cron-secret") === secret) return true
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // Compute previous calendar month by default
  const now = new Date()
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year  = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1

  const orgs = await prisma.organization.findMany({
    where:  { isActive: true, deletedAt: null },
    select: { id: true },
  })

  let success = 0, failed = 0
  for (const org of orgs) {
    try {
      await computeMonthlyMetric(org.id, year, month)
      success++
    } catch (err) {
      failed++
      console.error(`[cron/analytics-monthly] org ${org.id}:`, err)
    }
  }

  console.log(`[cron/analytics-monthly] ${year}-${month} orgs=${orgs.length} success=${success} failed=${failed}`)
  return Response.json({ year, month, total: orgs.length, success, failed })
}

export const GET  = handle
export const POST = handle
