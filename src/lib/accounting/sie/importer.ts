/**
 * SIE 4i / 4e importer
 *
 * Turns a ParsedSie into real DB records. Supports dry-run.
 *
 * Flow per journal (#VER):
 *   1. Resolve date → FiscalYear (by org)
 *   2. Skip if FiscalYear.status === 'closed'
 *   3. Resolve account numbers → account UUIDs (create if createMissingAccounts)
 *   4. Apply accountMapping overrides
 *   5. Check for existing journal (same series + number) → skip if skipExistingVerNumbers
 *   6. createJournal + postJournal
 */

import { prisma } from "@/lib/prisma"
import {
  parseSie,
  sieToIsoDate,
  ktypToAccountType,
  inferAccountType,
  normalSideForType,
  reportClassForType,
} from "./parser"
import type { ParsedSie, SieAccount } from "./parser"
import type { AccountType } from "@prisma/client"

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ImportSieOptions {
  dryRun:                 boolean
  accountMapping:         Record<string, string>  // SIE account# → our account#
  defaultJournalSeries:   string
  skipExistingVerNumbers: boolean
  createMissingAccounts:  boolean
}

export interface AccountDiff {
  number:  string
  name:    string
  action:  "create" | "exists" | "name_mismatch"
  ourName: string | null
}

export interface JournalPreview {
  series:      string
  number:      string
  date:        string
  description: string
  entryCount:  number
  action:      "import" | "skip_duplicate" | "skip_closed_year" | "skip_unresolved_account" | "skip_balance_error"
}

export interface ImportSiePreview {
  sieType:         number | null
  companyName:     string | null
  orgNr:           string | null
  fiscalYears:     { index: number; start: string; end: string }[]
  accountDiffs:    AccountDiff[]
  journals:        JournalPreview[]
  totalJournals:   number
  willImport:      number
  parseErrors:     string[]
  parseWarnings:   string[]
}

export interface ImportSieResult {
  accountsCreated: number
  journalsImported: number
  journalsSkipped:  number
  errors:   string[]
  warnings: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sekToOre(sek: number): bigint {
  return BigInt(Math.round(sek * 100))
}

async function resolveFiscalYear(
  organizationId: string,
  isoDate: string,
): Promise<{ id: string; status: string } | null> {
  return prisma.fiscalYear.findFirst({
    where: {
      organizationId,
      startDate: { lte: new Date(isoDate) },
      endDate:   { gte: new Date(isoDate) },
    },
    select: { id: true, status: true },
  })
}

async function resolveOrCreateAccount(
  organizationId: string,
  sieAcc: SieAccount,
  effectiveNumber: string,
  createMissing: boolean,
  dryRun: boolean,
): Promise<{ id: string; created: boolean } | null> {
  const existing = await prisma.account.findFirst({
    where: { organizationId, number: effectiveNumber, isActive: true },
    select: { id: true },
  })
  if (existing) return { id: existing.id, created: false }
  if (!createMissing) return null

  const type       = sieAcc.ktyp ? ktypToAccountType(sieAcc.ktyp) : inferAccountType(effectiveNumber)
  const normalSide = normalSideForType(type)
  const reportClass = reportClassForType(type)

  if (dryRun) return { id: "dry-run-placeholder", created: true }

  const created = await prisma.account.create({
    data: {
      organizationId,
      number: effectiveNumber,
      name:   sieAcc.name || `Konto ${effectiveNumber}`,
      type:   type as AccountType,
      normalSide,
      reportClass,
      isActive:         true,
      allowManualEntry: true,
    },
    select: { id: true },
  })
  return { id: created.id, created: true }
}

async function journalExists(
  organizationId: string,
  seriesPrefix: string,
  verNumber: string,
): Promise<boolean> {
  const series = await prisma.journalSeries.findFirst({
    where: { organizationId, prefix: seriesPrefix },
    select: { id: true },
  })
  if (!series) return false
  const num = parseInt(verNumber, 10)
  if (isNaN(num)) return false
  const j = await prisma.journal.findFirst({
    where: { organizationId, seriesId: series.id, number: num },
    select: { id: true },
  })
  return j !== null
}

// ─── Preview (dry-run diff) ───────────────────────────────────────────────────

export async function previewSieImport(
  organizationId: string,
  parsed: ParsedSie,
  opts: Pick<ImportSieOptions, "accountMapping" | "skipExistingVerNumbers" | "createMissingAccounts" | "defaultJournalSeries">,
): Promise<ImportSiePreview> {
  const accountDiffs: AccountDiff[] = []
  const journalPreviews: JournalPreview[] = []

  // Build account diff
  const sieAccountMap = new Map(parsed.accounts.map(a => [a.number, a]))
  for (const acc of parsed.accounts) {
    const effectiveNumber = opts.accountMapping[acc.number] ?? acc.number
    const existing = await prisma.account.findFirst({
      where: { organizationId, number: effectiveNumber, isActive: true },
      select: { name: true },
    })
    let action: AccountDiff["action"]
    if (!existing) {
      action = "create"
    } else if (existing.name !== acc.name && acc.name) {
      action = "name_mismatch"
    } else {
      action = "exists"
    }
    accountDiffs.push({
      number: effectiveNumber,
      name:   acc.name,
      action,
      ourName: existing?.name ?? null,
    })
  }

  // Build journal preview
  for (const ver of parsed.journals) {
    const series = (ver.series || opts.defaultJournalSeries).toUpperCase()
    const isoDate = ver.date.length === 8 ? sieToIsoDate(ver.date) : ver.date

    let action: JournalPreview["action"] = "import"

    if (ver.balanceError) {
      action = "skip_balance_error"
    } else {
      const fy = await resolveFiscalYear(organizationId, isoDate)
      if (!fy) {
        action = "skip_closed_year"
      } else if (fy.status === "closed") {
        action = "skip_closed_year"
      } else if (opts.skipExistingVerNumbers && await journalExists(organizationId, series, ver.number)) {
        action = "skip_duplicate"
      } else {
        // check all accounts resolvable
        for (const t of ver.trans) {
          const effectiveNumber = opts.accountMapping[t.account] ?? t.account
          const accEntry = sieAccountMap.get(t.account)
          const existing = await prisma.account.findFirst({
            where: { organizationId, number: effectiveNumber, isActive: true },
            select: { id: true },
          })
          if (!existing && !opts.createMissingAccounts) {
            action = "skip_unresolved_account"
            break
          }
          if (!existing && !accEntry) {
            action = "skip_unresolved_account"
            break
          }
        }
      }
    }

    journalPreviews.push({
      series, number: ver.number, date: ver.date,
      description: ver.description,
      entryCount: ver.trans.length,
      action,
    })
  }

  return {
    sieType:       parsed.sieType,
    companyName:   parsed.companyName,
    orgNr:         parsed.orgNr,
    fiscalYears:   parsed.fiscalYears,
    accountDiffs,
    journals:      journalPreviews,
    totalJournals: parsed.journals.length,
    willImport:    journalPreviews.filter(j => j.action === "import").length,
    parseErrors:   parsed.errors,
    parseWarnings: parsed.warnings,
  }
}

// ─── Execute import ───────────────────────────────────────────────────────────

export async function executeSieImport(
  organizationId: string,
  fileContent: string,    // base64-encoded raw SIE file
  charset: string,
  opts: ImportSieOptions,
  userId: string,
): Promise<ImportSieResult> {
  const { createJournal, postJournal } = await import("@/lib/accounting/journals")

  const buf    = Buffer.from(fileContent, "base64")
  const parsed = parseSie(buf, charset)

  const result: ImportSieResult = {
    accountsCreated: 0,
    journalsImported: 0,
    journalsSkipped: 0,
    errors:   [...parsed.errors],
    warnings: [...parsed.warnings],
  }

  if (opts.dryRun) {
    return result
  }

  const sieAccountMap = new Map(parsed.accounts.map(a => [a.number, a]))

  for (const ver of parsed.journals) {
    const series  = (ver.series || opts.defaultJournalSeries).toUpperCase()
    const isoDate = ver.date.length === 8 ? sieToIsoDate(ver.date) : ver.date

    if (ver.balanceError) {
      result.journalsSkipped++
      result.warnings.push(`VER ${series} ${ver.number}: hoppas över (obalanserat)`)
      continue
    }

    const fy = await resolveFiscalYear(organizationId, isoDate)
    if (!fy) {
      result.journalsSkipped++
      result.warnings.push(`VER ${series} ${ver.number}: inget räkenskapsår för datum ${isoDate}`)
      continue
    }
    if (fy.status === "closed") {
      result.journalsSkipped++
      result.warnings.push(`VER ${series} ${ver.number}: räkenskapsår stängt, hoppas över`)
      continue
    }

    if (opts.skipExistingVerNumbers && await journalExists(organizationId, series, ver.number)) {
      result.journalsSkipped++
      continue
    }

    // Resolve account UUIDs for all trans lines
    const entryInputs: {
      accountId:   string
      debit:       bigint
      credit:      bigint
      description: string | null
    }[] = []

    let skipJournal = false
    for (const t of ver.trans) {
      const effectiveNumber = opts.accountMapping[t.account] ?? t.account
      const sieAcc = sieAccountMap.get(t.account) ?? { number: effectiveNumber, name: "" }
      const resolved = await resolveOrCreateAccount(
        organizationId, sieAcc, effectiveNumber,
        opts.createMissingAccounts, false,
      )
      if (!resolved) {
        result.warnings.push(`VER ${series} ${ver.number}: konto ${effectiveNumber} finns inte — verifikat hoppas över`)
        skipJournal = true
        break
      }
      if (resolved.created) result.accountsCreated++

      const oreAmt = sekToOre(Math.abs(t.amount))
      entryInputs.push({
        accountId:   resolved.id,
        debit:       t.amount >= 0 ? oreAmt : 0n,
        credit:      t.amount <  0 ? oreAmt : 0n,
        description: t.text ?? null,
      })
    }
    if (skipJournal) { result.journalsSkipped++; continue }

    if (entryInputs.length < 2) {
      result.warnings.push(`VER ${series} ${ver.number}: för få rader, hoppas över`)
      result.journalsSkipped++
      continue
    }

    try {
      const journal = await createJournal({
        organizationId,
        fiscalYearId:    fy.id,
        seriesPrefix:    series,
        date:            isoDate,
        description:     ver.description || `SIE import ${series}${ver.number}`,
        sourceType:      "sie_import",
        createdByUserId: userId,
        entries:         entryInputs,
      })
      await postJournal(organizationId, journal.id, userId)
      result.journalsImported++
    } catch (err) {
      result.errors.push(`VER ${series} ${ver.number}: ${err instanceof Error ? err.message : String(err)}`)
      result.journalsSkipped++
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action:     "sie_import_execute",
      entityType: "SieImport",
      entityId:   organizationId,
      meta: {
        accountsCreated:  result.accountsCreated,
        journalsImported: result.journalsImported,
        journalsSkipped:  result.journalsSkipped,
        errorCount:       result.errors.length,
      },
    },
  }).catch(() => {})

  return result
}
