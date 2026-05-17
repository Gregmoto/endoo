/**
 * postManualJournal — convenience wrapper for posting a journal by account code.
 *
 * Used by the SIE4 import connector (and future manual-entry UI).
 * Resolves account codes to UUIDs, creates a draft journal, then posts it.
 * Unknown account codes are auto-created as inactive placeholders so the
 * import doesn't fail silently — the accountant can fix them later.
 */

import { prisma }        from "@/lib/prisma"
import { createJournal, postJournal } from "@/lib/accounting/journals"
import { assertPeriodOpen, getOrCreatePeriod } from "./periods"

export interface ManualJournalLine {
  accountCode: string
  debit:       bigint
  credit:      bigint
  description?: string
}

export interface PostManualJournalInput {
  organizationId: string
  userId:         string
  description:    string
  journalDate:    Date
  lines:          ManualJournalLine[]
  reference?:     string
  seriesPrefix?:  string
}

/**
 * Resolves account codes to UUIDs. Creates placeholder accounts for unknown codes
 * tagged as `isActive: false` so they appear in the chart-of-accounts review queue.
 */
async function resolveAccountIds(
  organizationId: string,
  codes:          string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(codes)]
  const existing = await prisma.account.findMany({
    where:  { organizationId, number: { in: unique } },
    select: { id: true, number: true },
  })

  const map = new Map(existing.map((a) => [a.number, a.id]))
  const missing = unique.filter((c) => !map.has(c))

  for (const code of missing) {
    const accType = inferAccountType(code)
    const acc = await prisma.account.create({
      data: {
        organizationId,
        number:      code,
        name:        `[Importerat] ${code}`,
        type:        accType,
        normalSide:  accType === "asset" || accType === "expense" ? "debit" : "credit",
        reportClass: accType === "asset" || accType === "liability" || accType === "equity"
                       ? "balance_sheet"
                       : "income_statement",
        isActive: false,  // needs review
      },
    })
    map.set(code, acc.id)
  }

  return map
}

function inferAccountType(code: string): "asset" | "liability" | "equity" | "income" | "expense" {
  const n = parseInt(code, 10)
  if (n >= 1000 && n < 2000) return "asset"
  if (n >= 2000 && n < 3000) return "liability"
  if (n >= 3000 && n < 4000) return "income"
  if (n >= 4000 && n < 8000) return "expense"
  if (n >= 8000)              return "equity"
  return "asset"
}

export async function postManualJournal(input: PostManualJournalInput): Promise<void> {
  const dateStr = input.journalDate.toISOString().slice(0, 10)

  // Resolve account codes → UUIDs (auto-create placeholders if needed)
  const codes      = input.lines.map((l) => l.accountCode)
  const accountMap = await resolveAccountIds(input.organizationId, codes)

  // Find fiscal year (journals.ts createJournal resolves by date)
  const fy = await prisma.fiscalYear.findFirst({
    where: {
      organizationId: input.organizationId,
      startDate: { lte: input.journalDate },
      endDate:   { gte: input.journalDate },
      status:    "open",
    },
  })
  if (!fy) throw new Error(`No open fiscal year for date ${dateStr}`)

  // Check period is open
  await prisma.$transaction(async (tx) => {
    await assertPeriodOpen(tx as never, input.organizationId, input.journalDate)
    await getOrCreatePeriod(tx as never, input.organizationId, fy.id, input.journalDate)
  })

  // Create draft journal
  const journal = await createJournal({
    organizationId:  input.organizationId,
    fiscalYearId:    fy.id,
    seriesPrefix:    input.seriesPrefix ?? "A",
    date:            dateStr,
    description:     input.description,
    sourceType:      input.reference ? "import" : undefined,
    createdByUserId: input.userId,
    entries: input.lines
      .filter((l) => l.debit > 0n || l.credit > 0n)
      .map((l, i) => ({
        accountId:   accountMap.get(l.accountCode)!,
        debit:       l.debit,
        credit:      l.credit,
        description: l.description ?? null,
        sortOrder:   i,
      })),
  })

  // Post immediately
  await postJournal(input.organizationId, journal.id, input.userId)
}
