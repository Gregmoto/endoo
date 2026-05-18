import { describe, it, expect } from "vitest"
import { applyRounding, formatOre } from "@/lib/invoicing/rounding"

describe("applyRounding", () => {
  it("off mode — no adjustment", () => {
    const r = applyRounding(12345n, "off")
    expect(r.rounded).toBe(12345n)
    expect(r.adjustment).toBe(0n)
  })

  it("manual mode — no adjustment", () => {
    const r = applyRounding(12345n, "manual")
    expect(r.rounded).toBe(12345n)
    expect(r.adjustment).toBe(0n)
  })

  it("auto — already whole kronor", () => {
    const r = applyRounding(12300n, "auto")
    expect(r.rounded).toBe(12300n)
    expect(r.adjustment).toBe(0n)
  })

  it("auto — round down (< 50 öre)", () => {
    const r = applyRounding(12340n, "auto")
    expect(r.rounded).toBe(12300n)
    expect(r.adjustment).toBe(-40n)
  })

  it("auto — round up (> 50 öre)", () => {
    const r = applyRounding(12360n, "auto")
    expect(r.rounded).toBe(12400n)
    expect(r.adjustment).toBe(40n)
  })

  it("auto — exactly 50 öre, even kronor → round down (banker's)", () => {
    // 10050 → 100.5 kr, 100 is even → round down to 10000
    const r = applyRounding(10050n, "auto")
    expect(r.rounded).toBe(10000n)
    expect(r.adjustment).toBe(-50n)
  })

  it("auto — exactly 50 öre, odd kronor → round up (banker's)", () => {
    // 10150 → 101.5 kr, 101 is odd → round up to 10200
    const r = applyRounding(10150n, "auto")
    expect(r.rounded).toBe(10200n)
    expect(r.adjustment).toBe(50n)
  })
})

describe("formatOre", () => {
  it("formats positive amount with 2 decimals", () => {
    expect(formatOre(12345n)).toBe("123,45")
  })

  it("formats negative amount", () => {
    expect(formatOre(-12345n)).toBe("-123,45")
  })

  it("formats with 0 decimals", () => {
    expect(formatOre(12345n, 0)).toBe("123")
  })

  it("pads öre to 2 digits", () => {
    expect(formatOre(10005n)).toBe("100,05")
  })
})
