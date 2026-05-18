import { describe, it, expect } from "vitest"
import { formatMoney, parseMoneyInput, formatMoneyInput } from "@/lib/format/money"

describe("parseMoneyInput", () => {
  it("accepts comma decimal '1 234,56'", () => expect(parseMoneyInput("1 234,56")).toBe("123456"))
  it("accepts dot decimal '1234.56'", () => expect(parseMoneyInput("1234.56")).toBe("123456"))
  it("accepts no-space '1234,56'", () => expect(parseMoneyInput("1234,56")).toBe("123456"))
  it("accepts integer '100' as 100 kr → 10000 öre", () => expect(parseMoneyInput("100")).toBe("10000"))
  it("returns null for empty string", () => expect(parseMoneyInput("")).toBeNull())
  it("returns null for letters", () => expect(parseMoneyInput("abc")).toBeNull())
  it("parses negative '-100,00'", () => expect(parseMoneyInput("-100,00")).toBe("-10000"))
})

describe("formatMoney", () => {
  it("formats öre as SEK", () => {
    const result = formatMoney("10050", "SEK")
    expect(result).toContain("100")
    expect(result).toContain("50")
  })
  it("handles bigint", () => {
    expect(formatMoney(10050n, "SEK")).toBe(formatMoney("10050", "SEK"))
  })
  it("handles zero", () => {
    const result = formatMoney("0", "SEK")
    expect(result).toContain("0")
  })
  it("returns — for null-ish", () => {
    expect(formatMoney("", "SEK")).toBe("—")
  })
})
