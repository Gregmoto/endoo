/**
 * GET /api/cron/accruals-monthly
 *
 * Posts accrual periods for the previous calendar month across all organizations.
 * Vercel Cron: "0 3 1 * *"
 * Security: Authorization: Bearer {CRON_SECRET}
 */

import { prisma }            from "@/lib/prisma"
import { postAccrualPeriod } from "@/lib/accounting/accruals/post"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

function previousMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const period = previousMonth()

  // Find orgs with planned accrual periods for this month
  const orgs = await prisma.accrualPeriod.findMany({
    where:    { period, status: "planned" },
    select:   { organizationId: true },
    distinct: ["organizationId"],
  })

  const results: Array<{ organizationId: string; posted: number; error?: string }> = []

  for (const { organizationId } of orgs) {
    try {
      const org = await prisma.organization.findUnique({
        where:  { id: organizationId },
        select: { members: { where: { role: "owner" }, select: { userId: true }, take: 1 } },
      })
      const userId = org?.members[0]?.userId
      if (!userId) { results.push({ organizationId, posted: 0, error: "no owner" }); continue }

      const result = await postAccrualPeriod(organizationId, period, userId)
      results.push({ organizationId, posted: result.posted })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ organizationId, posted: 0, error: message })
      console.error(`[cron/accruals-monthly] org=${organizationId}`, err)
    }
  }

  const totalPosted = results.reduce((s, r) => s + r.posted, 0)
  const errors      = results.filter(r => r.error).length

  return Response.json({ period, orgs: orgs.length, totalPosted, errors })
}
