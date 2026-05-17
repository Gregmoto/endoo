import { prisma } from "@/lib/prisma"
import {
  queryOutstanding,
  queryRevenue,
  queryCashIn,
  queryCashOut,
  queryMrr,
  queryVatForecast,
  queryContactMetrics,
  queryPaymentBehaviour,
  startOfMonth,
  endOfMonth,
  startOfYear,
  todayDate,
} from "./queries"
import type { Prisma } from "@prisma/client"

export async function computeAnalyticsSnapshot(organizationId: string): Promise<void> {
  const now        = new Date()
  const today      = todayDate()
  const mthStart   = startOfMonth(now)
  const mthEnd     = endOfMonth(now)
  const yrStart    = startOfYear(now)

  const [
    outstanding,
    { revenueOre: revenueMonthOre },
    { revenueOre: revenueYtdOre },
    cashInMonth,
    cashOutMonth,
    mrrOre,
    vatForecast,
    contactMetrics,
    paymentBehaviour,
  ] = await Promise.all([
    queryOutstanding(organizationId),
    queryRevenue(organizationId, mthStart, mthEnd),
    queryRevenue(organizationId, yrStart, mthEnd),
    queryCashIn(organizationId, mthStart, mthEnd),
    queryCashOut(organizationId, mthStart, mthEnd),
    queryMrr(organizationId),
    queryVatForecast(organizationId),
    queryContactMetrics(organizationId, mthStart, mthEnd),
    queryPaymentBehaviour(organizationId),
  ])

  // MRR change vs last month
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthRow  = await prisma.monthlyMetric.findUnique({
    where: {
      organizationId_year_month: {
        organizationId,
        year:  lastMonthDate.getFullYear(),
        month: lastMonthDate.getMonth() + 1,
      },
    },
    select: { mrrOre: true },
  })
  const prevMrr   = Number(lastMonthRow?.mrrOre ?? 0n)
  const currMrr   = Number(mrrOre)
  const mrrChange = prevMrr > 0 ? ((currMrr - prevMrr) / prevMrr) * 100 : 0

  const data = {
    outstandingCount:     outstanding.outstandingCount,
    outstandingAmountOre: outstanding.outstandingAmountOre,
    overdueCount:         outstanding.overdueCount,
    overdueAmountOre:     outstanding.overdueAmountOre,
    agingBuckets:         outstanding.agingBuckets as unknown as Prisma.InputJsonValue,
    revenueMonthOre,
    revenueYtdOre,
    mrrOre,
    mrrChange,
    cashInMonthOre:  cashInMonth,
    cashOutMonthOre: cashOutMonth,
    netCashflowOre:  cashInMonth - cashOutMonth,
    vatOutputOre:    vatForecast.vatOutputOre,
    vatInputOre:     vatForecast.vatInputOre,
    vatLiabilityOre: vatForecast.vatLiabilityOre,
    nextVatDueDate:  vatForecast.nextVatDueDate,
    activeContactCount: contactMetrics.activeContactCount,
    newContactsMonth:   contactMetrics.newContactsMonth,
    avgDaysToPayment:   paymentBehaviour.avgDaysToPayment,
    latePaymentRate:    paymentBehaviour.latePaymentRate,
    computedAt: now,
  }

  await prisma.analyticsSnapshot.upsert({
    where:  { organizationId_date: { organizationId, date: today } },
    create: { organizationId, date: today, ...data },
    update: data,
  })
}

export async function computeMonthlyMetric(
  organizationId: string,
  year: number,
  month: number,
): Promise<void> {
  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month, 0, 23, 59, 59, 999)

  const [
    { revenueOre, invoiceCount },
    cashInOre,
    cashOutOre,
    newContactCount,
    mrrOre,
    paymentBehaviour,
    paidInvoiceCount,
  ] = await Promise.all([
    queryRevenue(organizationId, start, end),
    queryCashIn(organizationId, start, end),
    queryCashOut(organizationId, start, end),
    prisma.contact.count({
      where: { organizationId, deletedAt: null, createdAt: { gte: start, lte: end } },
    }),
    queryMrr(organizationId),
    queryPaymentBehaviour(organizationId),
    prisma.invoice.count({
      where: {
        organizationId,
        deletedAt: null,
        type:      "invoice",
        status:    "paid",
        paidAt:    { gte: start, lte: end },
      },
    }),
  ])

  const data = {
    revenueOre,
    cashInOre,
    cashOutOre,
    invoiceCount,
    paidInvoiceCount,
    newContactCount,
    mrrOre,
    avgDaysToPayment: paymentBehaviour.avgDaysToPayment,
  }

  await prisma.monthlyMetric.upsert({
    where:  { organizationId_year_month: { organizationId, year, month } },
    create: { organizationId, year, month, ...data },
    update: data,
  })
}
