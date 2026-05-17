/**
 * Dimension reporting service.
 *
 * getPnlByDimension  — P&L per dimension value within an axis
 * getProjectOverview — budget vs actual for a single project dimension
 * getDimensionLedger — all journal entries tagged to a dimension (paginated)
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DimensionPnlRow {
  dimensionId:   string
  dimensionCode: string
  dimensionName: string
  axisCode:      string
  accountId:     string
  accountNumber: string
  accountName:   string
  accountType:   string
  effectiveDebit:  number  // öre — entry.debit * (percentage / 100)
  effectiveCredit: number  // öre — entry.credit * (percentage / 100)
  net:             number  // effectiveCredit - effectiveDebit (positive = income/liability)
}

export interface ProjectOverview {
  dimension:    { id: string; code: string; name: string; status: string; budget: bigint | null; startDate: Date | null; endDate: Date | null; ownerId: string | null }
  totalRevenue: bigint  // sum of income accounts (3xxx), effective
  totalCost:    bigint  // sum of expense accounts (4xxx–8xxx), effective
  netResult:    bigint  // totalRevenue - totalCost
  budgetRemaining: bigint | null  // budget - netResult (null if no budget)
  journalCount: number
  invoiceIds:   string[]
  supplierInvoiceIds: string[]
  byMonth:      Array<{ year: number; month: number; revenue: bigint; cost: bigint }>
}

// ─── getPnlByDimension ────────────────────────────────────────────────────────

/**
 * Returns P&L aggregated per dimension value within an axis.
 * Only includes posted journals within the date range.
 *
 * @param axisId    the dimension axis to report on (e.g. "project" axis id)
 * @param from      start of period (inclusive)
 * @param to        end of period (inclusive)
 */
export async function getPnlByDimension(
  organizationId: string,
  axisId:         string,
  from:           Date,
  to:             Date,
): Promise<DimensionPnlRow[]> {
  // Raw query for efficiency — joining JED × JE × Journal × Account × Dimension
  const rows = await prisma.$queryRaw<Array<{
    dimension_id:    string
    dimension_code:  string
    dimension_name:  string
    axis_code:       string
    account_id:      string
    account_number:  string
    account_name:    string
    account_type:    string
    effective_debit:  string  // Postgres returns numeric as string
    effective_credit: string
  }>>`
    SELECT
      d.id                                                     AS dimension_id,
      jed.dimension_code_snapshot                              AS dimension_code,
      jed.dimension_name_snapshot                              AS dimension_name,
      jed.axis_code_snapshot                                   AS axis_code,
      a.id                                                     AS account_id,
      a.number                                                 AS account_number,
      a.name                                                   AS account_name,
      a.type                                                   AS account_type,
      SUM(je.debit  * jed.percentage / 100)::TEXT              AS effective_debit,
      SUM(je.credit * jed.percentage / 100)::TEXT              AS effective_credit
    FROM journal_entry_dimensions jed
    JOIN journal_entries  je ON je.id         = jed.journal_entry_id
    JOIN journals         j  ON j.id          = je.journal_id
    JOIN accounts         a  ON a.id          = je.account_id
    JOIN dimensions       d  ON d.id          = jed.dimension_id
    WHERE jed.organization_id = ${organizationId}
      AND d.axis_id           = ${axisId}
      AND j.status            = 'posted'
      AND j.date             >= ${from}
      AND j.date             <= ${to}
    GROUP BY d.id, jed.dimension_code_snapshot, jed.dimension_name_snapshot,
             jed.axis_code_snapshot, a.id, a.number, a.name, a.type
    ORDER BY d.id, a.number
  `

  return rows.map((r) => {
    const debit  = Number(r.effective_debit)
    const credit = Number(r.effective_credit)
    return {
      dimensionId:    r.dimension_id,
      dimensionCode:  r.dimension_code,
      dimensionName:  r.dimension_name,
      axisCode:       r.axis_code,
      accountId:      r.account_id,
      accountNumber:  r.account_number,
      accountName:    r.account_name,
      accountType:    r.account_type,
      effectiveDebit:  debit,
      effectiveCredit: credit,
      net:             credit - debit,
    }
  })
}

// ─── getProjectOverview ───────────────────────────────────────────────────────

/**
 * Returns a full project overview: budget vs actual, linked invoices,
 * monthly breakdown.
 */
export async function getProjectOverview(
  organizationId: string,
  dimensionId:    string,
): Promise<ProjectOverview> {
  const dimension = await prisma.dimension.findFirst({
    where: { id: dimensionId, organizationId },
  })
  if (!dimension) throw new Error(`Dimension not found: ${dimensionId}`)

  // Aggregate effective amounts per account type
  const ledgerRows = await prisma.$queryRaw<Array<{
    account_type:    string
    effective_debit:  string
    effective_credit: string
    journal_count:   string
  }>>`
    SELECT
      a.type                                                   AS account_type,
      SUM(je.debit  * jed.percentage / 100)::TEXT              AS effective_debit,
      SUM(je.credit * jed.percentage / 100)::TEXT              AS effective_credit,
      COUNT(DISTINCT j.id)::TEXT                               AS journal_count
    FROM journal_entry_dimensions jed
    JOIN journal_entries  je ON je.id  = jed.journal_entry_id
    JOIN journals         j  ON j.id   = je.journal_id
    JOIN accounts         a  ON a.id   = je.account_id
    WHERE jed.organization_id = ${organizationId}
      AND jed.dimension_id    = ${dimensionId}
      AND j.status            = 'posted'
    GROUP BY a.type
  `

  // Monthly breakdown (income_statement accounts only)
  const monthlyRows = await prisma.$queryRaw<Array<{
    year:             number
    month:            number
    account_type:     string
    effective_debit:  string
    effective_credit: string
  }>>`
    SELECT
      EXTRACT(YEAR  FROM j.date)::INT                          AS year,
      EXTRACT(MONTH FROM j.date)::INT                          AS month,
      a.type                                                   AS account_type,
      SUM(je.debit  * jed.percentage / 100)::TEXT              AS effective_debit,
      SUM(je.credit * jed.percentage / 100)::TEXT              AS effective_credit
    FROM journal_entry_dimensions jed
    JOIN journal_entries  je ON je.id  = jed.journal_entry_id
    JOIN journals         j  ON j.id   = je.journal_id
    JOIN accounts         a  ON a.id   = je.account_id
    WHERE jed.organization_id = ${organizationId}
      AND jed.dimension_id    = ${dimensionId}
      AND j.status            = 'posted'
      AND a.report_class      = 'income_statement'
    GROUP BY EXTRACT(YEAR FROM j.date), EXTRACT(MONTH FROM j.date), a.type
    ORDER BY year, month
  `

  // Linked invoices (via InvoiceLineItemDimension)
  const invoiceLinks = await prisma.invoiceLineItemDimension.findMany({
    where: { organizationId, dimensionId },
    select: { lineItem: { select: { invoiceId: true } } },
    distinct: ["lineItemId"],
  })
  const invoiceIds = [...new Set(invoiceLinks.map((l) => l.lineItem.invoiceId))]

  // Linked supplier invoices
  const supplierLinks = await prisma.supplierInvoiceDimension.findMany({
    where:  { organizationId, dimensionId },
    select: { supplierInvoiceId: true },
  })
  const supplierInvoiceIds = [...new Set(supplierLinks.map((l) => l.supplierInvoiceId))]

  // Compute totals
  let totalRevenue = 0n
  let totalCost    = 0n
  let journalCount = 0

  for (const r of ledgerRows) {
    const debit  = BigInt(Math.round(Number(r.effective_debit)))
    const credit = BigInt(Math.round(Number(r.effective_credit)))
    journalCount += Number(r.journal_count)

    if (r.account_type === "income") {
      totalRevenue += credit - debit  // income: credit normal
    } else if (r.account_type === "expense") {
      totalCost += debit - credit     // expense: debit normal
    }
  }

  const netResult       = totalRevenue - totalCost
  const budgetRemaining = dimension.budget != null ? dimension.budget - netResult : null

  // Build monthly breakdown
  const monthMap = new Map<string, { year: number; month: number; revenue: bigint; cost: bigint }>()
  for (const r of monthlyRows) {
    const key   = `${r.year}-${r.month}`
    const entry = monthMap.get(key) ?? { year: r.year, month: r.month, revenue: 0n, cost: 0n }
    const debit  = BigInt(Math.round(Number(r.effective_debit)))
    const credit = BigInt(Math.round(Number(r.effective_credit)))
    if (r.account_type === "income")  entry.revenue += credit - debit
    if (r.account_type === "expense") entry.cost    += debit - credit
    monthMap.set(key, entry)
  }

  return {
    dimension: {
      id:        dimension.id,
      code:      dimension.code,
      name:      dimension.name,
      status:    dimension.status,
      budget:    dimension.budget,
      startDate: dimension.startDate,
      endDate:   dimension.endDate,
      ownerId:   dimension.ownerId,
    },
    totalRevenue,
    totalCost,
    netResult,
    budgetRemaining,
    journalCount,
    invoiceIds,
    supplierInvoiceIds,
    byMonth: [...monthMap.values()].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month),
  }
}

// ─── getDimensionLedger ───────────────────────────────────────────────────────

/**
 * Lists all journal entries tagged to a dimension, paginated.
 */
export async function getDimensionLedger(
  organizationId: string,
  dimensionId:    string,
  limit:          number = 50,
  cursor?:        string,
) {
  const where: Prisma.JournalEntryDimensionWhereInput = {
    organizationId,
    dimensionId,
    journalEntry: { journal: { status: "posted" } },
    ...(cursor ? { id: { lt: cursor } } : {}),
  }

  const rows = await prisma.journalEntryDimension.findMany({
    where,
    orderBy: { journalEntry: { journal: { date: "desc" } } },
    take:    limit + 1,
    include: {
      journalEntry: {
        include: {
          journal: { select: { id: true, reference: true, date: true, description: true } },
          account: { select: { number: true, name: true } },
        },
      },
    },
  })

  const hasMore    = rows.length > limit
  const items      = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return { items, nextCursor, hasMore }
}
