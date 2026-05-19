import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    const orgId = ctx.organizationId
    const now = new Date()

    const items: { id: string; type: string; severity: string; title: string; count: number; href: string }[] = []

    const overdueCount = await prisma.invoice.count({
      where: { organizationId: orgId, status: "overdue", deletedAt: null },
    })
    if (overdueCount > 0) {
      items.push({ id: "overdue", type: "overdue_invoices", severity: "error", title: `${overdueCount} fakturor förfallna`, count: overdueCount, href: "/reminders" })
    }

    const pendingApproval = await prisma.supplierInvoice.count({
      where: { organizationId: orgId, status: { in: ["pending_approval", "needs_review"] } },
    }).catch(() => 0)
    if (pendingApproval > 0) {
      items.push({ id: "approvals", type: "pending_approvals", severity: "warning", title: `${pendingApproval} lev.fakturor att attestera`, count: pendingApproval, href: "/supplier-invoices?status=pending_approval" })
    }

    const vatDue = await prisma.vatPeriod.findFirst({
      where: {
        organizationId: orgId,
        status: { notIn: ["submitted", "locked"] },
        periodEnd: { lte: new Date(now.getTime() + 14 * 86400000) },
      },
      orderBy: { periodEnd: "asc" },
    }).catch(() => null)
    if (vatDue?.periodEnd) {
      const days = Math.ceil((vatDue.periodEnd.getTime() - now.getTime()) / 86400000)
      items.push({ id: "vat", type: "vat_deadline", severity: "warning", title: `Moms-period stänger om ${days} dagar`, count: days, href: "/tax/vat" })
    }

    const fy = await prisma.fiscalYear.findFirst({
      where: {
        organizationId: orgId,
        status: "open",
        endDate: { lte: new Date(now.getTime() + 30 * 86400000) },
      },
      orderBy: { endDate: "asc" },
    }).catch(() => null)
    if (fy?.endDate) {
      const days = Math.ceil((fy.endDate.getTime() - now.getTime()) / 86400000)
      items.push({ id: "fiscal", type: "fiscal_year_end", severity: "info", title: `Räkenskapsåret slutar om ${days} dagar`, count: days, href: "/reports/year-end" })
    }

    const oldDrafts = await prisma.invoice.count({
      where: {
        organizationId: orgId,
        status: "draft",
        deletedAt: null,
        createdAt: { lte: new Date(now.getTime() - 3 * 86400000) },
      },
    })
    if (oldDrafts > 0) {
      items.push({ id: "drafts", type: "old_drafts", severity: "info", title: `${oldDrafts} utkast sparade`, count: oldDrafts, href: "/invoices?status=draft" })
    }

    return Response.json({ items: items.slice(0, 5) })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
