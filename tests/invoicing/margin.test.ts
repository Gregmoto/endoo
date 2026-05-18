import { describe, it, expect } from "vitest"
import { calculateMarginPercent, calculateMarginAmount, calculateMarkupPercent } from "@/lib/invoicing/margin"

describe("calculateMarginPercent", () => {
  it("50% margin — sells at double cost", () => {
    expect(calculateMarginPercent(20000n, 10000n)).toBe(50)
  })

  it("0% margin — sells at cost", () => {
    expect(calculateMarginPercent(10000n, 10000n)).toBe(0)
  })

  it("100% margin — zero cost", () => {
    expect(calculateMarginPercent(10000n, 0n)).toBe(100)
  })

  it("zero sales price returns 0 (avoid division by zero)", () => {
    expect(calculateMarginPercent(0n, 10000n)).toBe(0)
  })

  it("negative margin — sells below cost", () => {
    expect(calculateMarginPercent(8000n, 10000n)).toBe(-25)
  })
})

describe("calculateMarginAmount", () => {
  it("returns difference in öre", () => {
    expect(calculateMarginAmount(20000n, 10000n)).toBe(10000n)
  })

  it("zero margin", () => {
    expect(calculateMarginAmount(10000n, 10000n)).toBe(0n)
  })
})

describe("calculateMarkupPercent", () => {
  it("100% markup — sells at double cost", () => {
    expect(calculateMarkupPercent(20000n, 10000n)).toBe(100)
  })

  it("0% markup", () => {
    expect(calculateMarkupPercent(10000n, 10000n)).toBe(0)
  })

  it("zero purchase price returns 0", () => {
    expect(calculateMarkupPercent(10000n, 0n)).toBe(0)
  })
})
