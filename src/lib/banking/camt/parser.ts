export interface CamtTransaction {
  entryDate: string
  bookingDate: string
  amount: number
  currency: string
  reference: string
  creditorRef?: string
  debtorName?: string
  debtorAccount?: string
  transactionId?: string
}

export interface CamtParseResult {
  messageId: string
  creationDate: string
  transactions: CamtTransaction[]
  errors: string[]
}

function extractTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i")
  const m = xml.match(re)
  return m ? m[1].trim() : undefined
}

function extractTagWithAttr(xml: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>([^<]*)</${tag}>`, "i")
  const m = xml.match(re)
  return m ? m[1].trim() : undefined
}

function extractAmountAndCurrency(xml: string): { amount: number; currency: string } {
  const re = /<Amt\s+Ccy="([^"]+)"[^>]*>([\d.,]+)<\/Amt>/i
  const m = xml.match(re)
  if (!m) return { amount: 0, currency: "SEK" }
  const currency = m[1]
  const raw = m[2].replace(",", ".")
  const amount = Math.round(parseFloat(raw) * 100)
  return { amount, currency }
}

function extractBetween(xml: string, openTag: string, closeTag: string): string[] {
  const results: string[] = []
  let pos = 0
  while (pos < xml.length) {
    const start = xml.indexOf(openTag, pos)
    if (start === -1) break
    const end = xml.indexOf(closeTag, start)
    if (end === -1) break
    results.push(xml.slice(start + openTag.length, end))
    pos = end + closeTag.length
  }
  return results
}

function parseEntry(entryXml: string, errors: string[]): CamtTransaction | null {
  try {
    const bookingDate = extractTag(entryXml, "BookgDt") || ""
    const dtInBooking = extractTag(bookingDate.length ? entryXml : entryXml, "Dt") || ""

    const bookingDtBlock = extractBetween(entryXml, "<BookgDt>", "</BookgDt>")[0] ?? ""
    const valDtBlock = extractBetween(entryXml, "<ValDt>", "</ValDt>")[0] ?? ""

    const bookingDtStr = extractTag(bookingDtBlock, "Dt") ?? ""
    const valDtStr = extractTag(valDtBlock, "Dt") ?? bookingDtStr

    const { amount, currency } = extractAmountAndCurrency(entryXml)

    const txDtlsBlocks = extractBetween(entryXml, "<TxDtls>", "</TxDtls>")
    const txDtls = txDtlsBlocks[0] ?? entryXml

    const strdBlock = extractBetween(txDtls, "<Strd>", "</Strd>")[0] ?? ""
    const cdtrRefInfBlock = extractBetween(strdBlock, "<CdtrRefInf>", "</CdtrRefInf>")[0] ?? ""
    const structuredRef = extractTag(cdtrRefInfBlock, "Ref")

    const ustrd = extractTag(txDtls, "Ustrd")
    const reference = structuredRef ?? ustrd ?? ""

    const debtorBlock = extractBetween(txDtls, "<Dbtr>", "</Dbtr>")[0] ?? ""
    const debtorName = extractTag(debtorBlock, "Nm")

    const debtorAcctBlock = extractBetween(txDtls, "<DbtrAcct>", "</DbtrAcct>")[0] ?? ""
    const debtorIban = extractTag(debtorAcctBlock, "IBAN")
    const debtorOtherAcct = extractTag(debtorAcctBlock, "Id")

    const txId = extractTag(txDtls, "EndToEndId") ?? extractTag(txDtls, "Refs")

    return {
      entryDate: valDtStr,
      bookingDate: bookingDtStr,
      amount,
      currency,
      reference,
      creditorRef: structuredRef,
      debtorName,
      debtorAccount: debtorIban ?? debtorOtherAcct,
      transactionId: txId,
    }
  } catch (err) {
    errors.push(`Failed to parse entry: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

export function parseCamt054(xmlContent: string): CamtParseResult {
  const result: CamtParseResult = {
    messageId: "",
    creationDate: "",
    transactions: [],
    errors: [],
  }

  if (!xmlContent || xmlContent.trim().length === 0) {
    result.errors.push("Empty XML content")
    return result
  }

  try {
    const grpHdrBlock = extractBetween(xmlContent, "<GrpHdr>", "</GrpHdr>")[0] ?? ""
    result.messageId = extractTag(grpHdrBlock, "MsgId") ?? ""
    const creDtTm = extractTag(grpHdrBlock, "CreDtTm") ?? ""
    result.creationDate = creDtTm.slice(0, 10)

    const entryBlocks = extractBetween(xmlContent, "<Ntry>", "</Ntry>")
    for (const block of entryBlocks) {
      const tx = parseEntry(block, result.errors)
      if (tx) result.transactions.push(tx)
    }
  } catch (err) {
    result.errors.push(`Failed to parse XML: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}
