/**
 * Ledger operations — createJournal, postJournal, voidJournal
 *
 * Responsibilities:
 *   - Seed default fiscal year and journal series for a new organization
 *   - Create draft journals with atomic sequence-number allocation
 *   - Post draft journals (balance validation + fiscal year check)
 *   - Void posted journals (reversing journal + immediate post)
 *   - Tenant isolation: organizationId on every read/write
 *
 * Monetary amounts are BigInt in öre (1 SEK = 100 öre).
 * Every completed journal satisfies: SUM(debit) = SUM(credit) > 0.
 */

import { prisma } from "@/lib/prisma"
import type {
  Journal,
  JournalEntry,
  FiscalYear,
  JournalSeries,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

// ─── Error types ──────────────────────────────────────────────────────────────

export class JournalNotFoundError extends Error {
  constructor(id: string) { super(`Journal not found: ${id}`) }
}

export class JournalSeriesNotFoundError extends Error {
  constructor(prefix: string) { super(`Journal series not found: ${prefix}`) }
}

export class FiscalYearNotFoundError extends Error {
  constructor() { super("No open fiscal year found for the given date") }
}

export class FiscalYearNotOpenError extends Error {
  constructor(status: string) { super(`Fiscal year is ${status} — cannot post to it`) }
}

export class JournalNotDraftError extends Error {
  constructor(status: string) { super(`Journal is ${status} — only draft journals can be posted`) }
}

export class JournalNotPostedError extends Error {
  constructor(status: string) { super(`Journal is ${status} — only posted journals can be voided`) }
}

export class JournalAlreadyVoidedError extends Error {
  constructor() { super("Journal is already voided") }
}

export class LedgerEmptyError extends Error {
  constructor(count: number) { super(`Journal has ${count} entries — minimum 2 required`) }
}

export class LedgerImbalanceError extends Error {
  constructor(debit: bigint, credit: bigint) {
    super(`Journal is unbalanced: debit=${debit} credit=${credit} diff=${debit - credit}`)
  }
}

export class AccountInvalidError extends Error {
  constructor(accountId: string, reason: string) {
    super(`Account ${accountId}: ${reason}`)
  }
}

export class JournalDateOutOfRangeError extends Error {
  constructor(date: string, startDate: string, endDate: string) {
    super(`Journal date ${date} is outside fiscal year range ${startDate}–${endDate}`)
  }
}

// ─── Input schemas ────────────────────────────────────────────────────────────

export const JournalEntryInputSchema = z.object({
  accountId:   z.string().uuid(),
  debit:       z.bigint().min(0n),
  credit:      z.bigint().min(0n),
  description: z.string().max(500).optional().nullable(),
  vatCode:     z.string().max(10).optional().nullable(),
  sortOrder:   z.number().int().optional(),
}).refine(
  row => !(row.debit > 0n && row.credit > 0n),
  { message: "An entry cannot have both debit and credit > 0" }
).refine(
  row => row.debit > 0n || row.credit > 0n,
  { message: "An entry must have either debit or credit > 0" }
)

export const CreateJournalSchema = z.object({
  organizationId:  z.string().uuid(),
  fiscalYearId:    z.string().uuid().optional(),   // resolved from date if omitted
  seriesPrefix:    z.string().max(5).default("A"),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description:     z.string().min(1).max(500),
  sourceType:      z.string().max(50).optional().nullable(),
  sourceId:        z.string().uuid().optional().nullable(),
  createdByUserId: z.string().uuid().optional().nullable(),
  entries:         z.array(JournalEntryInputSchema).min(2),
})

export type CreateJournalInput  = z.infer<typeof CreateJournalSchema>
export type JournalEntryInput   = z.infer<typeof JournalEntryInputSchema>

export type JournalWithEntries = Journal & { entries: JournalEntry[] }

// ─── seedLedgerDefaults ───────────────────────────────────────────────────────

/**
 * Creates the default FiscalYear (current calendar year) and three journal
 * series for a newly onboarded organization.
 *
 * Idempotent — safe to call multiple times.
 * Called fire-and-forget from the onboarding route.
 */
export async function seedLedgerDefaults(organizationId: string): Promise<void> {
  const now   = new Date()
  const year  = now.getFullYear()
  const name  = String(year)
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31`)

  // Upsert default fiscal year
  await prisma.fiscalYear.upsert({
    where:  { organizationId_name: { organizationId, name } },
    create: { organizationId, name, startDate: start, endDate: end, isDefault: true, status: "open" },
    update: {},   // if exists, don't touch it
  })

  // Upsert the three default series
  const series = [
    { prefix: "A", name: "Allmänna verifikationer", isDefault: true },
    { prefix: "K", name: "Kassaverifikationer",      isDefault: false },
    { prefix: "L", name: "Löner",                    isDefault: false },
  ]

  for (const s of series) {
    await prisma.journalSeries.upsert({
      where:  { organizationId_prefix: { organizationId, prefix: s.prefix } },
      create: { organizationId, ...s },
      update: {},
    })
  }
}

// ─── createJournal ────────────────────────────────────────────────────────────

/**
 * Creates a draft journal with all its entries in a single atomic transaction.
 *
 * Sequence allocation:
 *   The series.currentSeq is incremented inside the transaction so concurrent
 *   requests cannot get the same sequence number. The resulting reference
 *   (e.g. "A-0001") is denormalized onto the journal row for fast display.
 *
 * Validations applied before insert:
 *   - seriesPrefix must exist for the organization
 *   - All accountIds must belong to the organization and be active
 *   - date must be within the resolved fiscal year
 *   - entries must be valid per-row (schema) + balanced (SUM dr = SUM cr)
 */
export async function createJournal(
  input: CreateJournalInput
): Promise<JournalWithEntries> {
  const parsed = CreateJournalSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid journal input: ${JSON.stringify(parsed.error.flatten())}`)
  }
  const data = parsed.data
  const { organizationId } = data

  const journalDate = new Date(data.date)

  // Resolve fiscal year
  const fiscalYear = data.fiscalYearId
    ? await prisma.fiscalYear.findFirst({
        where: { id: data.fiscalYearId, organizationId },
      })
    : await resolveFiscalYearForDate(organizationId, journalDate)

  if (!fiscalYear) throw new FiscalYearNotFoundError()

  // Validate date is within fiscal year
  if (journalDate < fiscalYear.startDate || journalDate > fiscalYear.endDate) {
    throw new JournalDateOutOfRangeError(
      data.date,
      toDateString(fiscalYear.startDate),
      toDateString(fiscalYear.endDate)
    )
  }

  // Validate accounts
  await validateAccountIds(organizationId, data.entries.map(e => e.accountId))

  // Validate balance
  validateBalance(data.entries)

  // Atomic: increment sequence + create journal + create entries
  return prisma.$transaction(async (tx) => {
    // Lock and increment series counter
    const series = await tx.journalSeries.update({
      where:  { organizationId_prefix: { organizationId, prefix: data.seriesPrefix } },
      data:   { currentSeq: { increment: 1 } },
    })

    if (!series) throw new JournalSeriesNotFoundError(data.seriesPrefix)

    const number    = series.currentSeq
    const reference = `${series.prefix}-${String(number).padStart(4, "0")}`

    const journal = await tx.journal.create({
      data: {
        organizationId,
        fiscalYearId:    fiscalYear.id,
        seriesId:        series.id,
        number,
        reference,
        date:            journalDate,
        description:     data.description,
        status:          "draft",
        sourceType:      data.sourceType ?? null,
        sourceId:        data.sourceId   ?? null,
        createdByUserId: data.createdByUserId ?? null,
        entries: {
          create: data.entries.map((e, i) => ({
            organizationId,
            accountId:   e.accountId,
            debit:       e.debit,
            credit:      e.credit,
            description: e.description ?? null,
            vatCode:     e.vatCode    ?? null,
            sortOrder:   e.sortOrder  ?? i,
          })),
        },
      },
      include: { entries: true },
    })

    return journal
  })
}

// ─── postJournal ──────────────────────────────────────────────────────────────

/**
 * Transitions a draft journal to posted.
 *
 * Preconditions (throw on failure):
 *   1. Journal must be in draft status
 *   2. Fiscal year must be open
 *   3. At least 2 entries
 *   4. SUM(debit) = SUM(credit) > 0
 *
 * After posting the journal is immutable (enforced also by DB trigger).
 */
export async function postJournal(
  organizationId: string,
  journalId:      string,
  postedByUserId: string
): Promise<JournalWithEntries> {
  const journal = await getJournalWithEntries(organizationId, journalId)

  if (journal.status !== "draft") {
    throw new JournalNotDraftError(journal.status)
  }

  const fy = await prisma.fiscalYear.findUnique({ where: { id: journal.fiscalYearId } })
  if (!fy || fy.status !== "open") {
    throw new FiscalYearNotOpenError(fy?.status ?? "not found")
  }

  validateBalance(journal.entries)

  const posted = await prisma.journal.update({
    where: { id: journalId },
    data:  {
      status:         "posted",
      postedAt:       new Date(),
      postedByUserId,
    },
    include: { entries: true },
  })

  // Audit log (fire-and-forget)
  prisma.auditLog.create({
    data: {
      organizationId,
      userId:     postedByUserId,
      action:     "update",
      entityType: "Journal",
      entityId:   journalId,
      before:     { status: "draft" },
      after:      { status: "posted" },
      meta:       { reference: journal.reference, description: journal.description },
    },
  }).catch(() => {})

  return posted
}

// ─── voidJournal ─────────────────────────────────────────────────────────────

/**
 * Voids a posted journal by creating a reversing journal and posting it.
 *
 * Process:
 *   1. Create reversal journal in the same series (new sequence number)
 *      with all debit/credit sides swapped.
 *   2. Post the reversal immediately.
 *   3. Set original journal status = "voided", voidOf on the reversal.
 *
 * The reversal is done in a single transaction so both journals end up in
 * a consistent state or neither does.
 */
export async function voidJournal(
  organizationId:  string,
  journalId:       string,
  voidedByUserId:  string,
  reason:          string
): Promise<{ original: Journal; reversal: JournalWithEntries }> {
  const original = await getJournalWithEntries(organizationId, journalId)

  if (original.status === "voided") throw new JournalAlreadyVoidedError()
  if (original.status !== "posted") throw new JournalNotPostedError(original.status)

  const fy = await prisma.fiscalYear.findUnique({ where: { id: original.fiscalYearId } })
  if (!fy || fy.status !== "open") {
    throw new FiscalYearNotOpenError(fy?.status ?? "not found")
  }

  const series = await prisma.journalSeries.findFirst({
    where: { id: original.seriesId, organizationId },
  })
  if (!series) throw new JournalSeriesNotFoundError(original.seriesId)

  const { original: voidedOriginal, reversal } = await prisma.$transaction(async (tx) => {
    // Increment series for the reversal journal
    const updatedSeries = await tx.journalSeries.update({
      where: { id: series.id },
      data:  { currentSeq: { increment: 1 } },
    })

    const revNumber    = updatedSeries.currentSeq
    const revReference = `${series.prefix}-${String(revNumber).padStart(4, "0")}`
    const today        = new Date()

    // Create the reversing journal with swapped sides
    const reversal = await tx.journal.create({
      data: {
        organizationId,
        fiscalYearId:    original.fiscalYearId,
        seriesId:        series.id,
        number:          revNumber,
        reference:       revReference,
        date:            today,
        description:     `Makulering: ${original.reference} — ${reason}`,
        status:          "posted",
        sourceType:      "reversal",
        sourceId:        original.id,
        voidOf:          original.id,
        postedAt:        today,
        postedByUserId:  voidedByUserId,
        createdByUserId: voidedByUserId,
        entries: {
          create: original.entries.map((e, i) => ({
            organizationId,
            accountId:   e.accountId,
            debit:       e.credit,   // swap sides
            credit:      e.debit,
            description: e.description,
            vatCode:     e.vatCode,
            sortOrder:   i,
          })),
        },
      },
      include: { entries: true },
    })

    // Mark original as voided
    const voidedOriginal = await tx.journal.update({
      where: { id: journalId },
      data:  { status: "voided" },
    })

    return { original: voidedOriginal, reversal }
  })

  // Audit log (fire-and-forget)
  prisma.auditLog.create({
    data: {
      organizationId,
      userId:     voidedByUserId,
      action:     "delete",
      entityType: "Journal",
      entityId:   journalId,
      before:     { status: "posted" },
      after:      { status: "voided" },
      meta: {
        reason,
        reversalId:        reversal.id,
        reversalReference: reversal.reference,
        originalReference: original.reference,
      },
    },
  }).catch(() => {})

  return { original: voidedOriginal, reversal }
}

// ─── getJournal ───────────────────────────────────────────────────────────────

export async function getJournal(
  organizationId: string,
  journalId:      string
): Promise<Journal> {
  const journal = await prisma.journal.findFirst({
    where: { id: journalId, organizationId },
  })
  if (!journal) throw new JournalNotFoundError(journalId)
  return journal
}

export async function getJournalWithEntries(
  organizationId: string,
  journalId:      string
): Promise<JournalWithEntries> {
  const journal = await prisma.journal.findFirst({
    where:   { id: journalId, organizationId },
    include: { entries: { orderBy: { sortOrder: "asc" } } },
  })
  if (!journal) throw new JournalNotFoundError(journalId)
  return journal
}

// ─── listJournals ─────────────────────────────────────────────────────────────

export type JournalFilter = {
  fiscalYearId?:  string
  seriesId?:      string
  status?:        "draft" | "posted" | "voided"
  sourceType?:    string
  sourceId?:      string
  dateFrom?:      string
  dateTo?:        string
}

export async function listJournals(
  organizationId: string,
  filter:         JournalFilter = {},
  take = 50,
  skip = 0
): Promise<Journal[]> {
  const where: Prisma.JournalWhereInput = {
    organizationId,
    ...(filter.fiscalYearId && { fiscalYearId: filter.fiscalYearId }),
    ...(filter.seriesId     && { seriesId:     filter.seriesId }),
    ...(filter.status       && { status:       filter.status }),
    ...(filter.sourceType   && { sourceType:   filter.sourceType }),
    ...(filter.sourceId     && { sourceId:     filter.sourceId }),
    ...((filter.dateFrom || filter.dateTo) && {
      date: {
        ...(filter.dateFrom && { gte: new Date(filter.dateFrom) }),
        ...(filter.dateTo   && { lte: new Date(filter.dateTo) }),
      },
    }),
  }

  return prisma.journal.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    skip,
  })
}

// ─── getFiscalYears ───────────────────────────────────────────────────────────

export async function getFiscalYears(
  organizationId: string
): Promise<FiscalYear[]> {
  return prisma.fiscalYear.findMany({
    where:   { organizationId },
    orderBy: { startDate: "desc" },
  })
}

export async function getJournalSeries(
  organizationId: string
): Promise<JournalSeries[]> {
  return prisma.journalSeries.findMany({
    where:   { organizationId },
    orderBy: { prefix: "asc" },
  })
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function resolveFiscalYearForDate(
  organizationId: string,
  date:           Date
): Promise<FiscalYear | null> {
  return prisma.fiscalYear.findFirst({
    where: {
      organizationId,
      startDate: { lte: date },
      endDate:   { gte: date },
    },
    orderBy: { isDefault: "desc" },
  })
}

async function validateAccountIds(
  organizationId: string,
  accountIds:     string[]
): Promise<void> {
  const unique = [...new Set(accountIds)]
  const found  = await prisma.account.findMany({
    where: { id: { in: unique }, organizationId },
    select: { id: true, isActive: true, allowManualEntry: true },
  })

  const foundMap = new Map(found.map(a => [a.id, a]))
  for (const id of unique) {
    const account = foundMap.get(id)
    if (!account) {
      throw new AccountInvalidError(id, "not found or belongs to a different organization")
    }
    if (!account.isActive) {
      throw new AccountInvalidError(id, "account is inactive")
    }
  }
}

function validateBalance(entries: Array<{ debit: bigint; credit: bigint }>): void {
  if (entries.length < 2) {
    throw new LedgerEmptyError(entries.length)
  }

  let totalDebit  = 0n
  let totalCredit = 0n
  for (const e of entries) {
    totalDebit  += e.debit
    totalCredit += e.credit
  }

  if (totalDebit === 0n) {
    throw new LedgerEmptyError(0)
  }

  if (totalDebit !== totalCredit) {
    throw new LedgerImbalanceError(totalDebit, totalCredit)
  }
}
