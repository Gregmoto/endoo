import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    const orgId = ctx.organizationId

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { in: ["sent", "viewed", "partial", "overdue"] },
      },
      select: { totalAmount: true, paidAmount: true, status: true, dueDate: true },
    })
    const receivable = unpaidInvoices.reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount ?? 0), 0)
    const overdueCount = unpaidInvoices.filter(i => i.status === "overdue" || (i.dueDate && i.dueDate < now)).length
    const receivableCount = unpaidInvoices.length

    const payableInvoices = await prisma.supplierInvoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["approved", "booked"] },
      },
      select: { amountInclVat: true },
    }).catch(() => [])
    const payable = payableInvoices.reduce((s: number, i: { amountInclVat: unknown }) => s + Number(i.amountInclVat ?? 0), 0)
    const payableCount = payableInvoices.length

    const cashEntries = await prisma.journalEntry.findMany({
      where: {
        organizationId: orgId,
        account: { number: { startsWith: "19" } },
      },
      select: { debit: true, credit: true },
    }).catch(() => [])
    const cashDebit  = cashEntries.reduce((s, e) => s + Number(e.debit),  0)
    const cashCredit = cashEntries.reduce((s, e) => s + Number(e.credit), 0)
    const cash = cashDebit - cashCredit

    const monthEntries = await prisma.journalEntry.findMany({
      where: {
        organizationId: orgId,
        journal: { date: { gte: startOfMonth } },
        account: { number: { gte: "3000", lt: "9000" } },
      },
      select: { debit: true, credit: true, account: { select: { number: true } } },
    }).catch(() => [])

    let monthRevenue = 0, monthCost = 0
    for (const e of monthEntries) {
      const n = e.account.number
      const d = Number(e.debit)
      const c = Number(e.credit)
      if (n >= "3000" && n < "4000") {
        monthRevenue += c - d
      } else {
        monthCost += d - c
      }
    }
    const monthResult = monthRevenue - monthCost

    const prevMonthEntries = await prisma.journalEntry.findMany({
      where: {
        organizationId: orgId,
        journal: { date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
        account: { number: { gte: "3000", lt: "9000" } },
      },
      select: { debit: true, credit: true, account: { select: { number: true } } },
    }).catch(() => [])

    let prevRevenue = 0, prevCost = 0
    for (const e of prevMonthEntries) {
      const n = e.account.number
      const d = Number(e.debit)
      const c = Number(e.credit)
      if (n >= "3000" && n < "4000") {
        prevRevenue += c - d
      } else {
        prevCost += d - c
      }
    }
    const prevResult = prevRevenue - prevCost
    const resultChange = prevResult !== 0 ? ((monthResult - prevResult) / Math.abs(prevResult) * 100) : null

    return Response.json({
      cash:          { value: cash, label: "Kassa" },
      receivable:    { value: receivable, count: receivableCount, hasOverdue: overdueCount > 0 },
      payable:       { value: payable, count: payableCount },
      monthResult:   { value: monthResult, changePercent: resultChange },
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
