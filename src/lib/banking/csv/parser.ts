export interface CsvColumnMapping {
  date: string
  amount: string
  reference: string
  sender?: string
  account?: string
}

export interface CsvTransaction {
  paymentDate: string
  amount: number
  reference: string
  senderName?: string
  senderAccount?: string
  rawRow: Record<string, string>
}

export interface CsvParseResult {
  transactions: CsvTransaction[]
  headers: string[]
  errors: string[]
}

function parseAmount(raw: string, format: "decimal_point" | "decimal_comma"): number {
  let cleaned = raw.trim()
  if (format === "decimal_comma") {
    cleaned = cleaned.replace(/\s/g, "").replace(".", "").replace(",", ".")
  } else {
    cleaned = cleaned.replace(/\s/g, "").replace(",", "")
  }
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return NaN
  return Math.round(parsed * 100)
}

function parseDate(raw: string, format: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY"): string {
  const cleaned = raw.trim()
  if (format === "YYYY-MM-DD") {
    return cleaned
  }
  if (format === "DD/MM/YYYY") {
    const parts = cleaned.split("/")
    if (parts.length !== 3) return cleaned
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
  }
  if (format === "MM/DD/YYYY") {
    const parts = cleaned.split("/")
    if (parts.length !== 3) return cleaned
    return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
  }
  return cleaned
}

function parseCsvLine(line: string, separator: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === separator && !inQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

export function detectCsvSeparator(content: string): "," | ";" | "\t" {
  const firstLine = content.split(/\r?\n/)[0] ?? ""
  const counts = {
    ",": (firstLine.match(/,/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  }
  if (counts["\t"] > 0 && counts["\t"] >= counts[","] && counts["\t"] >= counts[";"] ) return "\t"
  if (counts[";"] > 0 && counts[";"] >= counts[","]) return ";"
  return ","
}

export function detectColumns(content: string): string[] {
  const separator = detectCsvSeparator(content)
  const firstLine = content.split(/\r?\n/)[0] ?? ""
  return parseCsvLine(firstLine, separator).map((h) => h.trim().replace(/^"|"$/g, ""))
}

export function parseCsv(
  content: string,
  mapping: CsvColumnMapping,
  options?: {
    separator?: "," | ";" | "\t"
    dateFormat?: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY"
    amountFormat?: "decimal_point" | "decimal_comma"
  },
): CsvParseResult {
  const result: CsvParseResult = {
    transactions: [],
    headers: [],
    errors: [],
  }

  if (!content || content.trim().length === 0) {
    result.errors.push("Empty CSV content")
    return result
  }

  const separator = options?.separator ?? detectCsvSeparator(content)
  const dateFormat = options?.dateFormat ?? "YYYY-MM-DD"
  const amountFormat = options?.amountFormat ?? "decimal_point"

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    result.errors.push("No lines found")
    return result
  }

  const headers = parseCsvLine(lines[0], separator).map((h) => h.trim().replace(/^"|"$/g, ""))
  result.headers = headers

  const colIndex = (name: string): number => headers.findIndex((h) => h === name)

  const dateIdx = colIndex(mapping.date)
  const amountIdx = colIndex(mapping.amount)
  const refIdx = colIndex(mapping.reference)
  const senderIdx = mapping.sender ? colIndex(mapping.sender) : -1
  const accountIdx = mapping.account ? colIndex(mapping.account) : -1

  if (dateIdx === -1) result.errors.push(`Column not found: ${mapping.date}`)
  if (amountIdx === -1) result.errors.push(`Column not found: ${mapping.amount}`)
  if (refIdx === -1) result.errors.push(`Column not found: ${mapping.reference}`)

  if (dateIdx === -1 || amountIdx === -1 || refIdx === -1) return result

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i], separator)
    const rawRow: Record<string, string> = {}
    headers.forEach((h, idx) => {
      rawRow[h] = (fields[idx] ?? "").trim().replace(/^"|"$/g, "")
    })

    const rawDate = rawRow[mapping.date] ?? ""
    const rawAmount = rawRow[mapping.amount] ?? ""
    const rawRef = rawRow[mapping.reference] ?? ""

    const amount = parseAmount(rawAmount, amountFormat)
    if (isNaN(amount)) {
      result.errors.push(`Row ${i + 1}: invalid amount "${rawAmount}"`)
      continue
    }

    const tx: CsvTransaction = {
      paymentDate: parseDate(rawDate, dateFormat),
      amount,
      reference: rawRef,
      rawRow,
    }

    if (senderIdx !== -1 && mapping.sender) {
      const val = rawRow[mapping.sender]
      if (val) tx.senderName = val
    }
    if (accountIdx !== -1 && mapping.account) {
      const val = rawRow[mapping.account]
      if (val) tx.senderAccount = val
    }

    result.transactions.push(tx)
  }

  return result
}
