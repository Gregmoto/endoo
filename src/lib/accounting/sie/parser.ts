/**
 * SIE 4i / 4e parser
 *
 * Handles:
 *   - Charset: CP437 (default), UTF-8, Latin-1
 *   - All standard labels: #FNAMN, #ORGNR, #FORMAT, #SIETYP, #VERPROG,
 *     #PROSA, #FNR, #FTYP, #RAR, #TAXAR, #KPTYP, #VALUTA,
 *     #KONTO, #KTYP, #UNDERDIM, #DIM, #OBJEKT, #IB, #UB, #RES,
 *     #PSALDO, #PBUDGET, #VER, #TRANS, #RTRANS, #BTRANS, #KSUMMA
 *   - Validates double-entry balance per VER (debit == credit)
 *   - Error messages include line numbers
 */

// ─── CP437 lookup table (0x80–0xFF → Unicode) ────────────────────────────────
// Only the chars that appear in Swedish SIE files matter; the rest fall back
// to their code-point (mostly box-drawing, which SIE files don't contain).
const CP437: Record<number, string> = {
  0x80: "Ç", 0x81: "ü", 0x82: "é", 0x83: "â", 0x84: "ä", 0x85: "à",
  0x86: "å", 0x87: "ç", 0x88: "ê", 0x89: "ë", 0x8A: "è", 0x8B: "ï",
  0x8C: "î", 0x8D: "ì", 0x8E: "Ä", 0x8F: "Å", 0x90: "É", 0x91: "æ",
  0x92: "Æ", 0x93: "ô", 0x94: "ö", 0x95: "ò", 0x96: "û", 0x97: "ù",
  0x98: "ÿ", 0x99: "Ö", 0x9A: "Ü", 0x9B: "¢", 0x9C: "£", 0x9D: "¥",
  0x9F: "ƒ", 0xA0: "á", 0xA1: "í", 0xA2: "ó", 0xA3: "ú", 0xA4: "ñ",
  0xA5: "Ñ", 0xA6: "ª", 0xA7: "º", 0xA8: "¿", 0xAB: "½", 0xAC: "¼",
}

function decodeCp437(buf: Buffer): string {
  const chars: string[] = []
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    if (b < 0x80) {
      chars.push(String.fromCharCode(b))
    } else {
      chars.push(CP437[b] ?? String.fromCharCode(b))
    }
  }
  return chars.join("")
}

export function decodeBuffer(buf: Buffer, charset: string): string {
  const cs = charset.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (cs === "UTF8" || cs === "UTF-8") return buf.toString("utf8")
  if (cs === "LATIN1" || cs === "ISO88591" || cs === "WINDOWS1252") {
    return buf.toString("latin1")
  }
  return decodeCp437(buf)
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SieFiscalYear {
  index: number     // 0 = current, -1 = previous year, etc.
  start: string     // "YYYYMMDD"
  end:   string
}

export interface SieAccount {
  number: string
  name:   string
  ktyp?:  string   // T | S | E | I | K
}

export interface SieDimension {
  id:      number
  name:    string
  superId: number | null   // for #UNDERDIM
}

export interface SieObject {
  dimId:  number
  id:     string
  name:   string
}

export interface SieBalance {
  yearIndex:  number   // from #RAR
  account:    string
  amount:     number   // SEK (float)
  objectList: SieObjectRef[]
}

export interface SieObjectRef {
  dimId: number
  objId: string
}

export interface SieTrans {
  lineNo:    number
  account:   string
  amount:    number    // SEK (positive = debit, negative = credit)
  objectList: SieObjectRef[]
  date:      string | null
  text:      string | null
  type:      "TRANS" | "RTRANS" | "BTRANS"
}

export interface SieJournal {
  lineNo:      number
  series:      string
  number:      string
  date:        string   // "YYYYMMDD"
  description: string
  regDate:     string | null
  signature:   string | null
  trans:       SieTrans[]
  balanceError: boolean   // debit !== credit
}

export interface ParsedSie {
  sieType:        number | null
  programName:    string | null
  programVersion: string | null
  companyName:    string | null
  orgNr:          string | null
  fnr:            string | null
  ftyp:           string | null
  kptyp:          string | null
  currency:       string | null
  valuta:         string | null
  fiscalYears:    SieFiscalYear[]
  accounts:       SieAccount[]
  dims:           SieDimension[]
  objects:        SieObject[]
  openingBal:     SieBalance[]
  closingBal:     SieBalance[]
  results:        SieBalance[]
  journals:       SieJournal[]
  warnings:       string[]
  errors:         string[]       // include line numbers
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

function tokenize(line: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < line.length) {
    // skip whitespace
    while (i < line.length && /\s/.test(line[i])) i++
    if (i >= line.length) break

    if (line[i] === '"') {
      // quoted string
      i++
      let s = ""
      while (i < line.length && line[i] !== '"') {
        if (line[i] === "\\") { i++; s += line[i] ?? "" }
        else s += line[i]
        i++
      }
      i++ // closing quote
      tokens.push(s)
    } else if (line[i] === "{") {
      // object list — collect everything up to matching }
      let depth = 0
      let s = ""
      while (i < line.length) {
        if (line[i] === "{") depth++
        else if (line[i] === "}") { depth--; if (depth === 0) { i++; break } }
        s += line[i]
        i++
      }
      tokens.push(s + "}")
    } else {
      // bare token
      let s = ""
      while (i < line.length && !/\s/.test(line[i])) {
        s += line[i]; i++
      }
      tokens.push(s)
    }
  }
  return tokens
}

function parseObjectList(raw: string): SieObjectRef[] {
  const refs: SieObjectRef[] = []
  const inner = raw.replace(/^\{/, "").replace(/\}$/, "").trim()
  if (!inner) return refs
  // format: dimId "objId" dimId "objId" ...
  const parts = tokenize(inner)
  for (let i = 0; i + 1 < parts.length; i += 2) {
    refs.push({ dimId: parseInt(parts[i], 10), objId: parts[i + 1] })
  }
  return refs
}

function parseSieDate(s: string): string | null {
  if (!s || !/^\d{8}$/.test(s)) return null
  return s
}

function parseSieAmount(s: string): number | null {
  const n = parseFloat(s.replace(",", "."))
  return isNaN(n) ? null : n
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseSie(input: Buffer | string, charset = "CP437"): ParsedSie {
  const text = typeof input === "string" ? input : decodeBuffer(input, charset)

  const result: ParsedSie = {
    sieType: null, programName: null, programVersion: null,
    companyName: null, orgNr: null, fnr: null, ftyp: null,
    kptyp: null, currency: null, valuta: null,
    fiscalYears: [], accounts: [], dims: [], objects: [],
    openingBal: [], closingBal: [], results: [], journals: [],
    warnings: [], errors: [],
  }

  const accountMap = new Map<string, SieAccount>()

  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  let lineNo = 0

  // Current VER block state
  let inVer = false
  let currentJournal: SieJournal | null = null

  function warn(msg: string)  { result.warnings.push(`Rad ${lineNo}: ${msg}`) }
  function error(msg: string) { result.errors.push(`Rad ${lineNo}: ${msg}`) }

  for (let i = 0; i < rawLines.length; i++) {
    lineNo = i + 1
    const raw = rawLines[i].trim()

    if (!raw || raw.startsWith(";")) continue  // empty or comment

    if (raw === "{") {
      inVer = true
      continue
    }

    if (raw === "}") {
      if (inVer && currentJournal) {
        // validate balance
        let totalDebit = 0, totalCredit = 0
        for (const t of currentJournal.trans) {
          if (t.amount > 0) totalDebit  += t.amount
          else              totalCredit -= t.amount
        }
        const diff = Math.abs(totalDebit - totalCredit)
        if (diff > 0.005) {
          currentJournal.balanceError = true
          error(`VER ${currentJournal.series} ${currentJournal.number}: obalanserat verifikat (debet ${totalDebit.toFixed(2)}, kredit ${totalCredit.toFixed(2)})`)
        }
        result.journals.push(currentJournal)
      }
      inVer = false
      currentJournal = null
      continue
    }

    if (!raw.startsWith("#")) {
      if (!inVer) warn(`Okänd rad (saknar #): ${raw.slice(0, 60)}`)
      continue
    }

    const spaceIdx = raw.indexOf(" ")
    const label    = spaceIdx === -1 ? raw.slice(1).toUpperCase() : raw.slice(1, spaceIdx).toUpperCase()
    const rest     = spaceIdx === -1 ? "" : raw.slice(spaceIdx + 1)
    const tokens   = tokenize(rest)

    if (inVer && currentJournal) {
      // Inside a VER block — only TRANS/RTRANS/BTRANS expected
      if (label === "TRANS" || label === "RTRANS" || label === "BTRANS") {
        if (tokens.length < 3) { warn(`${label} saknar fält`); continue }
        const account    = tokens[0]
        const objListRaw = tokens[1]
        const amount     = parseSieAmount(tokens[2])
        if (amount === null) { warn(`${label}: ogiltigt belopp "${tokens[2]}"`); continue }
        const date    = tokens[3] ? parseSieDate(tokens[3]) : null
        const text    = tokens[4] ?? null
        currentJournal.trans.push({
          lineNo, account, amount, date, text,
          objectList: parseObjectList(objListRaw),
          type: label as "TRANS" | "RTRANS" | "BTRANS",
        })
      } else {
        warn(`Oväntat label inuti VER-block: #${label}`)
      }
      continue
    }

    // Top-level labels
    switch (label) {
      case "FLAGGA":
        break

      case "FORMAT":
        if (tokens[0]?.toUpperCase() !== "PC8") {
          warn(`FORMAT är "${tokens[0]}" — förväntat PC8 (CP437)`)
        }
        break

      case "SIETYP":
        result.sieType = parseInt(tokens[0], 10)
        break

      case "PROGRAM":
      case "VERPROG":
        result.programName    = tokens[0] ?? null
        result.programVersion = tokens[1] ?? null
        break

      case "GEN":
        break   // generation date — not stored

      case "FNAMN":
        result.companyName = tokens[0] ?? null
        break

      case "ORGNR":
        result.orgNr = tokens[0] ?? null
        break

      case "FNR":
        result.fnr = tokens[0] ?? null
        break

      case "FTYP":
        result.ftyp = tokens[0] ?? null
        break

      case "KPTYP":
        result.kptyp = tokens[0] ?? null
        break

      case "VALUTA":
        result.valuta = tokens[0] ?? null
        if (tokens[0] && tokens[0] !== "SEK") {
          warn(`Valuta är "${tokens[0]}" — enbart SEK stöds`)
        }
        break

      case "RAR": {
        const idx   = parseInt(tokens[0], 10)
        const start = tokens[1]
        const end   = tokens[2]
        if (!isNaN(idx) && start && end) {
          result.fiscalYears.push({ index: idx, start, end })
        }
        break
      }

      case "TAXAR":
      case "PROSA":
      case "OMFATTN":
        break   // informational only

      case "KONTO": {
        const number = tokens[0]
        const name   = tokens[1] ?? ""
        if (!number) { warn("KONTO saknar kontonummer"); break }
        const existing = accountMap.get(number)
        if (existing) {
          existing.name = name
        } else {
          const acc: SieAccount = { number, name }
          accountMap.set(number, acc)
          result.accounts.push(acc)
        }
        break
      }

      case "KTYP": {
        const number = tokens[0]
        const ktyp   = tokens[1]
        if (!number || !ktyp) { warn("KTYP saknar fält"); break }
        const acc = accountMap.get(number)
        if (acc) acc.ktyp = ktyp.toUpperCase()
        else {
          const newAcc: SieAccount = { number, name: "", ktyp: ktyp.toUpperCase() }
          accountMap.set(number, newAcc)
          result.accounts.push(newAcc)
        }
        break
      }

      case "DIM": {
        const id   = parseInt(tokens[0], 10)
        const name = tokens[1] ?? ""
        if (isNaN(id)) { warn("DIM saknar id"); break }
        result.dims.push({ id, name, superId: null })
        break
      }

      case "UNDERDIM": {
        const id      = parseInt(tokens[0], 10)
        const name    = tokens[1] ?? ""
        const superId = parseInt(tokens[2], 10)
        if (isNaN(id)) { warn("UNDERDIM saknar id"); break }
        result.dims.push({ id, name, superId: isNaN(superId) ? null : superId })
        break
      }

      case "OBJEKT": {
        const dimId = parseInt(tokens[0], 10)
        const id    = tokens[1] ?? ""
        const name  = tokens[2] ?? ""
        if (isNaN(dimId)) { warn("OBJEKT saknar dimension-id"); break }
        result.objects.push({ dimId, id, name })
        break
      }

      case "IB": {
        const yearIndex = parseInt(tokens[0], 10)
        const account   = tokens[1]
        const amtStr    = tokens[2]
        if (!account || amtStr === undefined) { warn("IB saknar fält"); break }
        const amount = parseSieAmount(amtStr)
        if (amount === null) { warn(`IB: ogiltigt belopp "${amtStr}"`); break }
        result.openingBal.push({
          yearIndex, account, amount,
          objectList: tokens[3] ? parseObjectList(tokens[3]) : [],
        })
        break
      }

      case "UB": {
        const yearIndex = parseInt(tokens[0], 10)
        const account   = tokens[1]
        const amtStr    = tokens[2]
        if (!account || amtStr === undefined) { warn("UB saknar fält"); break }
        const amount = parseSieAmount(amtStr)
        if (amount === null) { warn(`UB: ogiltigt belopp "${amtStr}"`); break }
        result.closingBal.push({
          yearIndex, account, amount,
          objectList: tokens[3] ? parseObjectList(tokens[3]) : [],
        })
        break
      }

      case "RES": {
        const yearIndex = parseInt(tokens[0], 10)
        const account   = tokens[1]
        const amtStr    = tokens[2]
        if (!account || amtStr === undefined) { warn("RES saknar fält"); break }
        const amount = parseSieAmount(amtStr)
        if (amount === null) { warn(`RES: ogiltigt belopp "${amtStr}"`); break }
        result.results.push({
          yearIndex, account, amount,
          objectList: tokens[3] ? parseObjectList(tokens[3]) : [],
        })
        break
      }

      case "PSALDO":
      case "PBUDGET":
        break   // period/budget saldos — not currently imported

      case "VER": {
        // #VER series number date description [regDate] [signature]
        const series = tokens[0] ?? "A"
        const number = tokens[1] ?? ""
        const date   = parseSieDate(tokens[2]) ?? tokens[2] ?? ""
        const desc   = tokens[3] ?? ""
        const regDate = tokens[4] ? (parseSieDate(tokens[4]) ?? null) : null
        const sig    = tokens[5] ?? null
        currentJournal = {
          lineNo, series, number, date, description: desc,
          regDate, signature: sig, trans: [], balanceError: false,
        }
        break
      }

      case "KSUMMA":
        break   // checksum — not verified

      default:
        warn(`Okänd label: #${label}`)
    }
  }

  if (inVer && currentJournal) {
    error(`VER ${currentJournal.series} ${currentJournal.number}: block inte avslutad med }`)
    result.journals.push(currentJournal)
  }

  return result
}

// ─── SIE date helpers ────────────────────────────────────────────────────────

/** "20260115" → "2026-01-15" */
export function sieToIsoDate(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

/** Map #KTYP code → our AccountType */
export function ktypToAccountType(
  ktyp: string,
): "asset" | "liability" | "equity" | "income" | "expense" {
  switch (ktyp.toUpperCase()) {
    case "T": return "asset"
    case "S": return "liability"
    case "E": return "equity"
    case "I": return "income"
    case "K": return "expense"
    default:  return "expense"
  }
}

/** Infer AccountType from BAS account number prefix when #KTYP is missing. */
export function inferAccountType(
  number: string,
): "asset" | "liability" | "equity" | "income" | "expense" {
  const n = parseInt(number.slice(0, 1), 10)
  if (n === 1) return "asset"
  if (n === 2) return "liability"
  if (n === 3) return "income"
  if (n <= 7)  return "expense"
  if (n === 8) return "income"   // financial
  return "expense"
}

/** Derive normalSide from account type. */
export function normalSideForType(
  type: "asset" | "liability" | "equity" | "income" | "expense",
): "debit" | "credit" {
  return type === "asset" || type === "expense" ? "debit" : "credit"
}

/** Derive reportClass from account type. */
export function reportClassForType(
  type: "asset" | "liability" | "equity" | "income" | "expense",
): "balance_sheet" | "income_statement" {
  return type === "asset" || type === "liability" || type === "equity"
    ? "balance_sheet"
    : "income_statement"
}
