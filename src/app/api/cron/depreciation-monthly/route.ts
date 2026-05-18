/**
 * GET /api/cron/depreciation-monthly
 *
 * Posts depreciation for all organizations that have active fixed assets,
 * for the previous calendar month.
 *
 * Designed to be called on the 1st of each month (Vercel Cron: "0 4 1 * *").
 * Security: Authorization: Bearer {CRON_SECRET}
 */

import { prisma }                  from "@/lib/prisma"
import { postPeriodDepreciation }  from "@/lib/accounting/fixed-assets/depreciation"

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
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const period = previousMonth()

  // Find all orgs that have active fixed assets
  const orgs = await prisma.fixedAsset.findMany({
    where:   { status: "active" },
    select:  { organizationId: true },
    distinct: ["organizationId"],
  })

  const results: Array<{ organizationId: string; posted: number; skipped: number; error?: string }> = []

  for (const { organizationId } of orgs) {
    try {
      // Use a system user ID (null-ish — cron has no actor)
      // postPeriodDepreciation requires a userId; use a sentinel that exists
      const org = await prisma.organization.findUnique({
        where:  { id: organizationId },
        select: { members: { where: { role: "owner" }, select: { userId: true }, take: 1 } },
      })
      const userId = org?.members[0]?.userId
      if (!userId) { results.push({ organizationId, posted: 0, skipped: 0, error: "no owner" }); continue }

      const result = await postPeriodDepreciation(organizationId, period, userId)
      results.push({ organizationId, posted: result.posted, skipped: result.skipped })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ organizationId, posted: 0, skipped: 0, error: message })
      console.error(`[cron/depreciation-monthly] org=${organizationId}`, err)
    }
  }

  const totalPosted  = results.reduce((s, r) => s + r.posted, 0)
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0)
  const errors       = results.filter(r => r.error).length

  return Response.json({ period, orgs: orgs.length, totalPosted, totalSkipped, errors })
}
