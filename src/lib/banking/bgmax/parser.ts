import type { BgMaxParseResult, BgMaxPayment } from "./types"

function field(line: string, start: number, end: number): string {
  return line.slice(start, end).trimEnd()
}

function formatDate(raw: string): string {
  if (raw.length !== 8) return raw
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

export function parseBgMax(content: string): BgMaxParseResult {
  const result: BgMaxParseResult = {
    fileDate: "",
    fileTime: "",
    payments: [],
    totalAmount: 0,
    totalCount: 0,
    errors: [],
  }

  if (!content || content.trim().length === 0) {
    result.errors.push("Empty file content")
    return result
  }

  const lines = content.split(/\r?\n/)
  let currentBgAccount = ""
  let currentPayment: BgMaxPayment | null = null

  const pushCurrent = () => {
    if (currentPayment) {
      result.payments.push(currentPayment)
      currentPayment = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.length < 2) continue

    const recordType = line.slice(0, 2)

    try {
      switch (recordType) {
        case "01": {
          result.fileDate = formatDate(field(line, 2, 10))
          result.fileTime = field(line, 10, 16)
          break
        }

        case "05": {
          pushCurrent()
          currentBgAccount = field(line, 2, 14)
          break
        }

        case "20":
        case "21": {
          pushCurrent()
          const amountStr = field(line, 54, 68)
          let amount = parseInt(amountStr, 10) || 0
          if (recordType === "21") amount = -amount

          const tcRaw = line.slice(76, 77).trim()
          currentPayment = {
            bgAccount: field(line, 2, 14) || currentBgAccount,
            reference: field(line, 14, 54),
            amount,
            paymentDate: formatDate(field(line, 68, 76)),
            transactionCode: tcRaw || recordType,
          }
          break
        }

        case "22": {
          if (currentPayment) {
            currentPayment.extraRef = field(line, 2, 37)
          }
          break
        }

        case "25": {
          if (currentPayment) {
            currentPayment.message = field(line, 2, 37)
          }
          break
        }

        case "26": {
          if (currentPayment) {
            currentPayment.senderName = field(line, 2, 37)
          }
          break
        }

        case "27": {
          if (currentPayment) {
            currentPayment.senderAccount = field(line, 2, 37)
          }
          break
        }

        case "30":
        case "31": {
          if (currentPayment) {
            currentPayment.rejected = true
          }
          break
        }

        case "90": {
          pushCurrent()
          const countStr = field(line, 2, 10)
          const amountStr = field(line, 10, 22)
          result.totalCount = parseInt(countStr, 10) || 0
          result.totalAmount = parseInt(amountStr, 10) || 0
          break
        }

        default:
          break
      }
    } catch (err) {
      result.errors.push(`Line ${i + 1} (record ${recordType}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  pushCurrent()

  return result
}
