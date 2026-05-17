import { prisma } from "@/lib/prisma"

// ─── Date helpers ────────────────────────────────────────────────────────────

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1)
}
export function todayDate(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// ─── Receivables + aging ─────────────────────────────────────────────────────

export async function queryOutstanding(organizationId: string) {
  const now = new Date()

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      deletedAt: null,
      type: "invoice",
      status: { in: ["sent", "viewed", "partial"] },
    },
    select: { totalAmount: true, paidAmount: true, dueDate: true },
  })

  let outstandingCount = 0
  let outstandingAmountOre = 0n
  let overdueCount = 0
  let overdueAmountOre = 0n

  const buckets = {
    current: { count: 0, amountOre: 0n },
    late30:  { count: 0, amountOre: 0n },
    late60:  { count: 0, amountOre: 0n },
    late90:  { count: 0, amountOre: 0n },
  }

  for (const inv of invoices) {
    const balance = inv.totalAmount - inv.paidAmount
    outstandingCount++
    outstandingAmountOre += balance

    const daysLate = Math.floor(
      (now.getTime() - inv.dueDate.getTime()) / 86_400_000,
    )

    if (daysLate > 0) {
      overdueCount++
      overdueAmountOre += balance
    }

    if (daysLate <= 0) {
      buckets.current.count++
      buckets.current.amountOre += balance
    } else if (daysLate <= 30) {
      buckets.late30.count++
      buckets.late30.amountOre += balance
    } else if (daysLate <= 60) {
      buckets.late60.count++
      buckets.late60.amountOre += balance
    } else {
      buckets.late90.count++
      buckets.late90.amountOre += balance
    }
  }

  return {
    outstandingCount,
    outstandingAmountOre,
    overdueCount,
    overdueAmountOre,
    agingBuckets: {
      current: { count: buckets.current.count, amountOre: Number(buckets.current.amountOre) },
      late30:  { count: buckets.late30.count,  amountOre: Number(buckets.late30.amountOre) },
      late60:  { count: buckets.late60.count,  amountOre: Number(buckets.late60.amountOre) },
      late90:  { count: buckets.late90.count,  amountOre: Number(buckets.late90.amountOre) },
    },
  }
}

// ─── Revenue (invoiced, excl. VAT) ────────────────────────────────────────────

export async function queryRevenue(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<{ revenueOre: bigint; invoiceCount: number }> {
  const result = await prisma.invoice.aggregate({
    where: {
      organizationId,
      deletedAt: null,
      type: "invoice",
      status: { notIn: ["draft", "void"] },
      issueDate: { gte: start, lte: end },
    },
    _sum: { subtotalAmount: true },
    _count: true,
  })
  return {
    revenueOre:   result._sum.subtotalAmount ?? 0n,
    invoiceCount: result._count,
  }
}

// ─── Cash in (payments received) ─────────────────────────────────────────────

export async function queryCashIn(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<bigint> {
  const result = await prisma.payment.aggregate({
    where: {
      organizationId,
      paymentDate: { gte: start, lte: end },
      method: { not: "credit_note" },
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0n
}

// ─── Cash out (supplier invoices paid) ────────────────────────────────────────

export async function queryCashOut(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<bigint> {
  const result = await prisma.supplierInvoice.aggregate({
    where: {
      organizationId,
      paidAt: { gte: start, lte: end },
      status: "paid",
    },
    _sum: { amountInclVat: true },
  })
  return result._sum.amountInclVat ?? 0n
}

// ─── MRR from recurring schedules ─────────────────────────────────────────────

export async function queryMrr(organizationId: string): Promise<bigint> {
  const schedules = await prisma.recurringSchedule.findMany({
    where: { organizationId, status: "active", deletedAt: null },
    select: { frequency: true, lines: { select: { unitPrice: true, quantity: true } } },
  })

  const monthlyMult: Record<string, number> = {
    weekly: 4.333,
    biweekly: 2.167,
    monthly: 1,
    quarterly: 0.333,
    yearly: 0.0833,
  }

  let mrrOre = 0n
  for (const s of schedules) {
    const mult = monthlyMult[s.frequency] ?? 1
    // Sum line amounts
    let scheduleAmount = 0n
    for (const line of s.lines) {
      scheduleAmount += BigInt(Math.round(Number(line.unitPrice) * Number(line.quantity)))
    }
    mrrOre += BigInt(Math.round(Number(scheduleAmount) * mult))
  }
  return mrrOre
}

// ─── VAT forecast ─────────────────────────────────────────────────────────────

export async function queryVatForecast(organizationId: string) {
  const now = new Date()

  const vatPeriod = await prisma.vatPeriod.findFirst({
    where: {
      organizationId,
      status: "open",
      periodStart: { lte: now },
    },
    orderBy: { periodEnd: "desc" },
  })

  if (!vatPeriod) {
    return { vatOutputOre: 0n, vatInputOre: 0n, vatLiabilityOre: 0n, nextVatDueDate: null }
  }

  const [outputResult, inputResult] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        type: { in: ["invoice", "credit_note"] },
        status: { notIn: ["draft", "void"] },
        issueDate: { gte: vatPeriod.periodStart, lte: vatPeriod.periodEnd },
      },
      _sum: { taxAmount: true },
    }),
    prisma.supplierInvoice.aggregate({
      where: {
        organizationId,
        status: { notIn: ["draft", "rejected"] },
        invoiceDate: { gte: vatPeriod.periodStart, lte: vatPeriod.periodEnd },
      },
      _sum: { vatAmount: true },
    }),
  ])

  const vatOutputOre    = outputResult._sum.taxAmount  ?? 0n
  const vatInputOre     = inputResult._sum.vatAmount   ?? 0n
  const vatLiabilityOre = vatOutputOre - vatInputOre

  return { vatOutputOre, vatInputOre, vatLiabilityOre, nextVatDueDate: vatPeriod.periodEnd }
}

// ─── Contact metrics ──────────────────────────────────────────────────────────

export async function queryContactMetrics(
  organizationId: string,
  monthStart: Date,
  monthEnd: Date,
) {
  const [activeContactCount, newContactsMonth] = await Promise.all([
    prisma.contact.count({
      where: { organizationId, status: "active", deletedAt: null },
    }),
    prisma.contact.count({
      where: { organizationId, deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
    }),
  ])
  return { activeContactCount, newContactsMonth }
}

// ─── Payment behaviour (rolling 12 months) ────────────────────────────────────

export async function queryPaymentBehaviour(organizationId: string) {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      deletedAt: null,
      type: "invoice",
      status: "paid",
      paidAt: { gte: cutoff },
    },
    select: { dueDate: true, paidAt: true },
  })

  if (invoices.length === 0) return { avgDaysToPayment: null, latePaymentRate: null }

  let totalDays = 0
  let lateCount = 0
  let counted   = 0

  for (const inv of invoices) {
    if (!inv.paidAt) continue
    const days = Math.floor((inv.paidAt.getTime() - inv.dueDate.getTime()) / 86_400_000)
    totalDays += days
    if (days > 0) lateCount++
    counted++
  }

  if (counted === 0) return { avgDaysToPayment: null, latePaymentRate: null }
  return {
    avgDaysToPayment: totalDays / counted,
    latePaymentRate:  lateCount / counted,
  }
}

// ─── 12-month trend from MonthlyMetric ────────────────────────────────────────

export type MonthPoint = {
  year:             number
  month:            number
  label:            string
  revenueOre:       number
  cashInOre:        number
  cashOutOre:       number
  invoiceCount:     number
  paidInvoiceCount: number
  newContactCount:  number
  mrrOre:           number
  avgDaysToPayment: number | null
}

export async function queryTrend(
  organizationId: string,
  months = 12,
): Promise<MonthPoint[]> {
  const now = new Date()

  const periods: { year: number; month: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  const rows = await prisma.monthlyMetric.findMany({
    where: {
      organizationId,
      OR: periods.map(p => ({ year: p.year, month: p.month })),
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  })

  return periods.map(p => {
    const row = rows.find(r => r.year === p.year && r.month === p.month)
    return {
      year:             p.year,
      month:            p.month,
      label:            `${p.year}-${String(p.month).padStart(2, "0")}`,
      revenueOre:       Number(row?.revenueOre ?? 0n),
      cashInOre:        Number(row?.cashInOre  ?? 0n),
      cashOutOre:       Number(row?.cashOutOre ?? 0n),
      invoiceCount:     row?.invoiceCount     ?? 0,
      paidInvoiceCount: row?.paidInvoiceCount ?? 0,
      newContactCount:  row?.newContactCount  ?? 0,
      mrrOre:           Number(row?.mrrOre ?? 0n),
      avgDaysToPayment: row?.avgDaysToPayment ?? null,
    }
  })
}
