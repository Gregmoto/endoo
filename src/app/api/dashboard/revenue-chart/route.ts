import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    const months = parseInt(req.nextUrl.searchParams.get("months") ?? "12")
    const orgId = ctx.organizationId

    const now = new Date()
    const result: { month: string; revenue: number }[] = []

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

      const entries = await prisma.journalEntry.findMany({
        where: {
          organizationId: orgId,
          account: { number: { gte: "3000", lt: "4000" } },
          journal: { date: { gte: start, lte: end } },
        },
        select: { debit: true, credit: true },
      }).catch(() => [])

      const revenue = entries.reduce((s: number, e: { debit: unknown; credit: unknown }) => {
        return s + Number(e.credit) - Number(e.debit)
      }, 0)

      result.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        revenue,
      })
    }

    const ytdStart = new Date(now.getFullYear(), 0, 1)
    const ytdEntries = await prisma.journalEntry.findMany({
      where: {
        organizationId: orgId,
        account: { number: { gte: "3000", lt: "4000" } },
        journal: { date: { gte: ytdStart } },
      },
      select: { debit: true, credit: true },
    }).catch(() => [])
    const ytd = ytdEntries.reduce((s: number, e: { debit: unknown; credit: unknown }) => s + Number(e.credit) - Number(e.debit), 0)

    const mtd = result[result.length - 1]?.revenue ?? 0

    return Response.json({ months: result, mtd, ytd })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
