import { describe, it, expect } from "vitest"
import { parseCamt054 } from "@/lib/banking/camt/parser"

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.06">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>MSG20260205001</MsgId>
      <CreDtTm>2026-02-05T12:00:00</CreDtTm>
    </GrpHdr>
    <Ntfctn>
      <Ntry>
        <BookgDt><Dt>2026-02-05</Dt></BookgDt>
        <ValDt><Dt>2026-02-05</Dt></ValDt>
        <Amt Ccy="SEK">368.00</Amt>
        <NtryDtls>
          <TxDtls>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Ref>000000001234567890</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`

describe("camt.054 parser", () => {
  it("parses message ID and creation date", () => {
    const result = parseCamt054(sampleXml)
    expect(result.messageId).toBe("MSG20260205001")
    expect(result.creationDate).toBe("2026-02-05")
  })

  it("parses one transaction from sample XML", () => {
    const result = parseCamt054(sampleXml)
    expect(result.transactions).toHaveLength(1)
  })

  it("parses amount to öre", () => {
    const result = parseCamt054(sampleXml)
    expect(result.transactions[0].amount).toBe(36800)
  })

  it("parses currency", () => {
    const result = parseCamt054(sampleXml)
    expect(result.transactions[0].currency).toBe("SEK")
  })

  it("parses structured reference (OCR)", () => {
    const result = parseCamt054(sampleXml)
    expect(result.transactions[0].reference).toBe("000000001234567890")
    expect(result.transactions[0].creditorRef).toBe("000000001234567890")
  })

  it("parses booking date", () => {
    const result = parseCamt054(sampleXml)
    expect(result.transactions[0].bookingDate).toBe("2026-02-05")
  })

  it("parses unstructured reference when no structured ref present", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.06">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>MSG001</MsgId>
      <CreDtTm>2026-03-01T10:00:00</CreDtTm>
    </GrpHdr>
    <Ntfctn>
      <Ntry>
        <BookgDt><Dt>2026-03-01</Dt></BookgDt>
        <ValDt><Dt>2026-03-01</Dt></ValDt>
        <Amt Ccy="SEK">100.00</Amt>
        <NtryDtls>
          <TxDtls>
            <RmtInf>
              <Ustrd>Faktura 1234</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`
    const result = parseCamt054(xml)
    expect(result.transactions[0].reference).toBe("Faktura 1234")
    expect(result.transactions[0].creditorRef).toBeUndefined()
  })

  it("parses multiple entries", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.06">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>MSG002</MsgId>
      <CreDtTm>2026-03-01T10:00:00</CreDtTm>
    </GrpHdr>
    <Ntfctn>
      <Ntry>
        <BookgDt><Dt>2026-03-01</Dt></BookgDt>
        <ValDt><Dt>2026-03-01</Dt></ValDt>
        <Amt Ccy="SEK">100.00</Amt>
        <NtryDtls><TxDtls><RmtInf><Ustrd>REF-001</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <BookgDt><Dt>2026-03-02</Dt></BookgDt>
        <ValDt><Dt>2026-03-02</Dt></ValDt>
        <Amt Ccy="SEK">250.50</Amt>
        <NtryDtls><TxDtls><RmtInf><Ustrd>REF-002</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`
    const result = parseCamt054(xml)
    expect(result.transactions).toHaveLength(2)
    expect(result.transactions[0].amount).toBe(10000)
    expect(result.transactions[1].amount).toBe(25050)
    expect(result.transactions[0].reference).toBe("REF-001")
    expect(result.transactions[1].reference).toBe("REF-002")
  })

  it("returns errors for empty content", () => {
    const result = parseCamt054("")
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.transactions).toHaveLength(0)
  })

  it("returns empty transactions for XML with no entries", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document><BkToCstmrDbtCdtNtfctn><GrpHdr><MsgId>X</MsgId><CreDtTm>2026-01-01T00:00:00</CreDtTm></GrpHdr></BkToCstmrDbtCdtNtfctn></Document>`
    const result = parseCamt054(xml)
    expect(result.transactions).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it("handles debtor name and account when present", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.06">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>MSG003</MsgId>
      <CreDtTm>2026-03-01T10:00:00</CreDtTm>
    </GrpHdr>
    <Ntfctn>
      <Ntry>
        <BookgDt><Dt>2026-03-01</Dt></BookgDt>
        <ValDt><Dt>2026-03-01</Dt></ValDt>
        <Amt Ccy="SEK">500.00</Amt>
        <NtryDtls>
          <TxDtls>
            <Dbtr><Nm>Test Testsson</Nm></Dbtr>
            <DbtrAcct><Id><IBAN>SE1234567890</IBAN></Id></DbtrAcct>
            <RmtInf><Ustrd>Payment</Ustrd></RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`
    const result = parseCamt054(xml)
    expect(result.transactions[0].debtorName).toBe("Test Testsson")
    expect(result.transactions[0].debtorAccount).toBe("SE1234567890")
  })
})
