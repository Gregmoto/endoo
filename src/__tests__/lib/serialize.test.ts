import { describe, it, expect } from "vitest"
import { toJSON, serializeMoney, parseMoney } from "@/lib/serialize"

describe("toJSON", () => {
  it("converts BigInt to string", () => {
    expect(toJSON({ amount: 10050n })).toEqual({ amount: "10050" })
  })
  it("handles nested BigInt", () => {
    expect(toJSON({ x: { y: 1n } })).toEqual({ x: { y: "1" } })
  })
  it("passes through non-BigInt values", () => {
    expect(toJSON({ a: 1, b: "str", c: true })).toEqual({ a: 1, b: "str", c: true })
  })
  it("handles arrays of BigInt", () => {
    expect(toJSON([1n, 2n, 3n])).toEqual(["1", "2", "3"])
  })
})

describe("serializeMoney", () => {
  it("formats SEK correctly", () => {
    const m = serializeMoney(10050n, "SEK")
    expect(m.amount).toBe("10050")
    expect(m.currency).toBe("SEK")
    expect(m.formatted).toContain("100")
    expect(m.formatted).toContain("50")
  })
  it("accepts number input", () => {
    expect(serializeMoney(10050, "SEK").amount).toBe("10050")
  })
  it("accepts string input", () => {
    expect(serializeMoney("10050", "SEK").amount).toBe("10050")
  })
})

describe("parseMoney", () => {
  it("parses comma decimal", () => { expect(parseMoney("100,50")).toBe(10050n) })
  it("parses dot decimal", () => { expect(parseMoney("100.50")).toBe(10050n) })
  it("parses space thousands + comma decimal", () => { expect(parseMoney("1 234,56")).toBe(123456n) })
  it("parses raw öre string", () => { expect(parseMoney("10050")).toBe(10050n) })
  it("parses zero", () => { expect(parseMoney("0,00")).toBe(0n) })
  it("parses number input (already öre)", () => { expect(parseMoney(10050)).toBe(10050n) })

  // round-trip tests
  const values = [0n, 1n, 100n, 9999n, 100000n, 123456789n]
  values.forEach(v => {
    it(`round-trips ${v}`, () => {
      const ser = serializeMoney(v, "SEK")
      expect(parseMoney(ser.amount)).toBe(v)
    })
  })

  // precision: value above 2^53
  it("handles value above Number.MAX_SAFE_INTEGER", () => {
    const big = BigInt("9007199254740993") // 2^53 + 1
    expect(parseMoney(big.toString())).toBe(big)
  })

  it("throws on invalid input", () => {
    expect(() => parseMoney("abc")).toThrow()
  })
})
