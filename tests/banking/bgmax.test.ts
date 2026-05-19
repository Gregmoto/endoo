import { describe, it, expect } from "vitest"
import { parseBgMax } from "@/lib/banking/bgmax/parser"

// BGMax fixed-width format (0-indexed slices):
// Record 01: slice(2,10)=date, slice(10,16)=time
// Record 05: slice(2,14)=bgAccount
// Record 20/21: slice(2,14)=bgAccount, slice(14,54)=reference(40), slice(54,68)=amount(14), slice(68,76)=date(8), slice(76,77)=txCode
// Record 22: slice(2,37)=extraRef
// Record 25: slice(2,37)=message
// Record 90: slice(2,10)=count, slice(10,22)=totalAmount

function pad(s: string, len: number): string {
  return s.padEnd(len, " ")
}

function r20(bgAccount: string, ref: string, amountOre: number, date: string, txCode = "0"): string {
  return (
    "20" +
    pad(bgAccount, 12) +
    pad(ref, 40) +
    String(amountOre).padStart(14, "0") +
    date +
    txCode
  )
}

function r21(bgAccount: string, ref: string, amountOre: number, date: string, txCode = "0"): string {
  return (
    "21" +
    pad(bgAccount, 12) +
    pad(ref, 40) +
    String(amountOre).padStart(14, "0") +
    date +
    txCode
  )
}

describe("BGMax parser", () => {
  it("parses a valid BGMax file with one payment", () => {
    const sampleBgMax = [
      "0120260105120000",
      "05" + pad("0000000001", 12),
      r20("0000000001", "000000001234567890", 36800, "20260205"),
      "90" + "00000001" + "000000036800",
    ].join("\n")
    const result = parseBgMax(sampleBgMax)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].amount).toBe(36800)
    expect(result.payments[0].reference).toBe("000000001234567890")
  })

  it("parses fileDate and fileTime from record 01", () => {
    const content = [
      "0120260205123000",
      "05" + pad("0000000001", 12),
      r20("0000000001", "000000009876543210", 10000, "20260205"),
      "90" + "00000001" + "000000010000",
    ].join("\n")
    const result = parseBgMax(content)
    expect(result.fileDate).toBe("2026-02-05")
    expect(result.fileTime).toBe("123000")
  })

  it("handles rejected payments (record 30-31)", () => {
    const content = [
      "0120260105120000",
      "05" + pad("BGACCOUNT", 12),
      r20("BGACCOUNT", "000000001111111111", 5000, "20260205"),
      "30",
      "90" + "00000001" + "000000005000",
    ].join("\n")
    const result = parseBgMax(content)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].rejected).toBe(true)
  })

  it("handles extra reference (record 22)", () => {
    const content = [
      "0120260105120000",
      "05" + pad("BGACCOUNT", 12),
      r20("BGACCOUNT", "000000002222222222", 7500, "20260205"),
      "22" + pad("EXTRA-REF-12345", 35),
      "90" + "00000001" + "000000007500",
    ].join("\n")
    const result = parseBgMax(content)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].extraRef).toBe("EXTRA-REF-12345")
  })

  it("handles message (record 25)", () => {
    const content = [
      "0120260105120000",
      "05" + pad("BGACCOUNT", 12),
      r20("BGACCOUNT", "000000003333333333", 1000, "20260205"),
      "25" + pad("Some message text", 35),
      "90" + "00000001" + "000000001000",
    ].join("\n")
    const result = parseBgMax(content)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].message).toBe("Some message text")
  })

  it("handles multiple payments in one file", () => {
    const content = [
      "0120260105120000",
      "05" + pad("BGACCOUNT", 12),
      r20("BGACCOUNT", "000000001111111111", 10000, "20260205"),
      r20("BGACCOUNT", "000000002222222222", 20000, "20260205"),
      r20("BGACCOUNT", "000000003333333333", 30000, "20260205"),
      "90" + "00000003" + "000000060000",
    ].join("\n")
    const result = parseBgMax(content)
    expect(result.payments).toHaveLength(3)
    expect(result.payments[0].amount).toBe(10000)
    expect(result.payments[1].amount).toBe(20000)
    expect(result.payments[2].amount).toBe(30000)
    expect(result.totalCount).toBe(3)
    expect(result.totalAmount).toBe(60000)
  })

  it("parses payment date correctly", () => {
    const content = [
      "0120260105120000",
      "05" + pad("BGACCOUNT", 12),
      r20("BGACCOUNT", "000000004444444444", 5000, "20260315"),
      "90" + "00000001" + "000000005000",
    ].join("\n")
    const result = parseBgMax(content)
    expect(result.payments[0].paymentDate).toBe("2026-03-15")
  })

  it("handles deduction (record 21) as negative amount", () => {
    const content = [
      "0120260105120000",
      "05" + pad("BGACCOUNT", 12),
      r21("BGACCOUNT", "000000005555555555", 2500, "20260205"),
      "90" + "00000001" + "000000002500",
    ].join("\n")
    const result = parseBgMax(content)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].amount).toBe(-2500)
  })

  it("returns errors for empty content", () => {
    const result = parseBgMax("")
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.payments).toHaveLength(0)
  })

  it("returns empty payments for malformed file without records", () => {
    const result = parseBgMax("not a bgmax file at all\nsome garbage")
    expect(result.payments).toHaveLength(0)
  })

  it("handles file with CRLF line endings", () => {
    const content = [
      "0120260105120000",
      "05" + pad("0000000001", 12),
      r20("0000000001", "000000001234567890", 36800, "20260205"),
      "90" + "00000001" + "000000036800",
    ].join("\r\n")
    const result = parseBgMax(content)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].amount).toBe(36800)
  })
})
