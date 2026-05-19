import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    const year  = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()))
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "5")
    const orgId = ctx.organizationId
    const start = new Date(year, 0, 1)
    const end   = new Date(year, 11, 31, 23, 59, 59)

    const data = await prisma.invoice.groupBy({
      by: ["contactId"],
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { notIn: ["draft", "void"] },
        issueDate: { gte: start, lte: end },
        contactId: { not: null },
      },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: limit,
    })

    const contacts = await prisma.contact.findMany({
      where: { id: { in: data.map(d => d.contactId!).filter(Boolean) } },
      select: { id: true, name: true },
    })

    const maxVal = data[0]?._sum.totalAmount ? Number(data[0]._sum.totalAmount) : 1

    const items = data.map((d, i) => {
      const contact = contacts.find(c => c.id === d.contactId)
      const total = Number(d._sum.totalAmount ?? 0)
      return { rank: i + 1, contactId: d.contactId, name: contact?.name ?? "Okänd", total, barWidth: Math.round(total / maxVal * 100) }
    })

    return Response.json({ items })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
