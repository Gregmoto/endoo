/**
 * Fortnox SIE4 file import connector.
 *
 * Auth strategy: file_import
 * Capabilities:  accounting, file_import
 *
 * Parses SIE4 export files from Fortnox (and compatible software)
 * and commits them as journal entries in Endoo's accounting engine.
 *
 * SIE4 spec: https://sie.se/format/
 *
 * Key labels handled:
 *   #FLAGGA  0|1
 *   #FORMAT  PC8
 *   #GEN     date agent
 *   #KONTO   accountNo name
 *   #IB      year accountNo balance
 *   #UB      year accountNo balance
 *   #VER     series verNo date description
 *   #TRANS   accountNo {} amount transDate transDescription
 */

import { prisma }                   from "@/lib/prisma"
import { postManualJournal }        from "@/services/accounting/manual-journal"
import type { Connector, ImportPreview, ImportPreviewEntry } from "../types"

// ─── SIE4 Parser ─────────────────────────────────────────────────────────────

interface SieTransaction {
  accountNo:   string
  amount:      number  // SEK as float
  date?:       string
  description: string
}

interface SieVoucher {
  series:       string
  verNo:        string
  date:         string
  description:  string
  transactions: SieTransaction[]
}

interface SieParsed {
  accounts:  Map<string, string>  // accountNo → name
  vouchers:  SieVoucher[]
  fromDate:  string
  toDate:    string
  warnings:  string[]
}

function parseSie4(content: string): SieParsed {
  // SIE4 files use CP437/PC8 encoding — we accept UTF-8 buffer from caller
  const lines    = content.split(/\r?\n/)
  const accounts = new Map<string, string>()
  const vouchers: SieVoucher[] = []
  const warnings: string[] = []
  let   currentVoucher: SieVoucher | null = null
  let   dates: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith("//")) continue

    // Tokenize respecting quoted strings
    const tokens = tokenize(line)
    const label  = tokens[0]?.toUpperCase()

    switch (label) {
      case "#KONTO":
        if (tokens[1] && tokens[2]) accounts.set(tokens[1], tokens[2])
        break

      case "#VER": {
        if (currentVoucher) vouchers.push(currentVoucher)
        currentVoucher = {
          series:       tokens[1] ?? "",
          verNo:        tokens[2] ?? "",
          date:         formatSieDate(tokens[3] ?? ""),
          description:  tokens[4] ?? "",
          transactions: [],
        }
        if (currentVoucher.date) dates.push(currentVoucher.date)
        break
      }

      case "#TRANS": {
        if (!currentVoucher) { warnings.push(`#TRANS outside #VER at: ${line}`); break }
        const amount = parseFloat(tokens[3] ?? "0")
        if (isNaN(amount)) { warnings.push(`Invalid amount in: ${line}`); break }
        currentVoucher.transactions.push({
          accountNo:   tokens[1] ?? "",
          amount,
          date:        tokens[4] ? formatSieDate(tokens[4]) : undefined,
          description: tokens[5] ?? currentVoucher.description,
        })
        break
      }

      case "}":
        if (currentVoucher) { vouchers.push(currentVoucher); currentVoucher = null }
        break
    }
  }
  if (currentVoucher) vouchers.push(currentVoucher)

  dates = dates.sort()
  return {
    accounts,
    vouchers,
    fromDate: dates[0]   ?? "",
    toDate:   dates.at(-1) ?? "",
    warnings,
  }
}

function tokenize(line: string): string[] {
  const tokens: string[] = []
  let   i = 0
  while (i < line.length) {
    if (line[i] === " " || line[i] === "\t") { i++; continue }
    if (line[i] === '"') {
      const end = line.indexOf('"', i + 1)
      tokens.push(end === -1 ? line.slice(i + 1) : line.slice(i + 1, end))
      i = end === -1 ? line.length : end + 1
    } else if (line[i] === "{") {
      const end = line.indexOf("}", i)
      tokens.push(line.slice(i, end === -1 ? line.length : end + 1))
      i = end === -1 ? line.length : end + 1
    } else {
      let j = i + 1
      while (j < line.length && line[j] !== " " && line[j] !== "\t") j++
      tokens.push(line.slice(i, j))
      i = j
    }
  }
  return tokens
}

function formatSieDate(s: string): string {
  // SIE dates: YYYYMMDD → YYYY-MM-DD
  if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`
  return s
}

// ─── Preview ──────────────────────────────────────────────────────────────────

async function parseImportFile(buffer: Buffer, _filename: string): Promise<ImportPreview> {
  const content = buffer.toString("latin1")  // SIE4 is PC8/CP437, latin1 is close enough for preview
  const parsed  = parseSie4(content)

  const entries: ImportPreviewEntry[] = []
  let journalCount = 0

  for (const v of parsed.vouchers) {
    const debits  = v.transactions.filter((t) => t.amount > 0)
    const credits = v.transactions.filter((t) => t.amount < 0)

    journalCount++
    // Build one entry per debit-credit pair for preview
    for (const d of debits) {
      for (const c of credits) {
        entries.push({
          date:          v.date,
          description:   v.description,
          debitAccount:  d.accountNo,
          creditAccount: c.accountNo,
          amount:        Math.round(Math.abs(d.amount) * 100),  // SEK → öre
        })
      }
    }
  }

  return {
    journalCount,
    accountCount:  parsed.accounts.size,
    periodCovered: { from: parsed.fromDate, to: parsed.toDate },
    warnings:      parsed.warnings,
    entries:       entries.slice(0, 50),  // preview cap
  }
}

// ─── Commit ───────────────────────────────────────────────────────────────────

async function commitImport(
  buffer:         Buffer,
  _filename:      string,
  organizationId: string,
  userId:         string,
  fileHash:       string,
): Promise<{ journalsCreated: number }> {
  const content = buffer.toString("latin1")
  const parsed  = parseSie4(content)

  // Find org's fiscal year for date routing
  const org = await prisma.organization.findUnique({
    where:  { id: organizationId },
    select: { id: true },
  })
  if (!org) throw new Error("Organization not found")

  let journalsCreated = 0

  for (const v of parsed.vouchers) {
    const journalDate = new Date(v.date)

    // Build line items
    const lines: { accountCode: string; debit: bigint; credit: bigint; description?: string }[] = []
    for (const t of v.transactions) {
      if (t.amount === 0) continue
      const öre = BigInt(Math.round(Math.abs(t.amount) * 100))
      lines.push({
        accountCode: t.accountNo,
        debit:       t.amount > 0 ? öre : 0n,
        credit:      t.amount < 0 ? öre : 0n,
        description: t.description !== v.description ? t.description : undefined,
      })
    }

    if (lines.length === 0) continue

    await postManualJournal({
      organizationId,
      userId,
      description:    `[SIE4] ${v.series}${v.verNo} ${v.description}`,
      journalDate,
      lines,
      reference:      `SIE4:${fileHash.slice(0, 8)}:${v.series}${v.verNo}`,
    })

    journalsCreated++
  }

  return { journalsCreated }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const fortnoxImportConnector: Connector = {
  config: {
    displayName:  "Fortnox (SIE4-import)",
    slug:         "fortnox_import",
    authStrategy: "file_import",
    capabilities: ["accounting", "file_import"],
  },
  parseImportFile,
  commitImport,
}
