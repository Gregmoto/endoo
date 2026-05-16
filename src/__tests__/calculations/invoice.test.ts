import { describe, it, expect } from "vitest"
import { calcLineTotal, calcTaxAmount } from "@/lib/contracts/utils"

describe("calcLineTotal()", () => {
  it("calculates line total with no discount", () => {
    expect(calcLineTotal(2, 10000, 0)).toBe(20000)
  })

  it("applies discount correctly", () => {
    expect(calcLineTotal(1, 10000, 0.1)).toBe(9000)   // 10% off
    expect(calcLineTotal(2, 10000, 0.25)).toBe(15000)  // 25% off
  })

  it("rounds to nearest öre (no fractional currency units)", () => {
    // 3 × 333.33 × 0.9 = 899.991 → rounds to 900
    expect(calcLineTotal(3, 33333, 0.1)).toBe(89999)
  })

  it("handles zero quantity", () => {
    expect(calcLineTotal(0, 10000, 0)).toBe(0)
  })

  it("handles 100% discount", () => {
    expect(calcLineTotal(5, 10000, 1)).toBe(0)
  })
})

describe("calcTaxAmount()", () => {
  it("calculates 25% VAT correctly", () => {
    expect(calcTaxAmount(10000, 0.25)).toBe(2500)
  })

  it("calculates 12% VAT correctly", () => {
    expect(calcTaxAmount(10000, 0.12)).toBe(1200)
  })

  it("calculates 6% VAT correctly", () => {
    expect(calcTaxAmount(10000, 0.06)).toBe(600)
  })

  it("zero tax rate returns zero", () => {
    expect(calcTaxAmount(10000, 0)).toBe(0)
  })

  it("rounds to nearest integer", () => {
    // 9999 × 0.25 = 2499.75 → rounds to 2500
    expect(calcTaxAmount(9999, 0.25)).toBe(2500)
  })
})

describe("invoice total calculation", () => {
  it("subtotal + tax = totalAmount", () => {
    const lines = [
      { quantity: 2, unitPrice: 50000, discountRate: 0, taxRate: 0.25 },
      { quantity: 1, unitPrice: 10000, discountRate: 0.1, taxRate: 0.12 },
    ]

    const computed = lines.map(l => {
      const lineTotal = calcLineTotal(l.quantity, l.unitPrice, l.discountRate)
      const taxAmount = calcTaxAmount(lineTotal, l.taxRate)
      return { lineTotal, taxAmount }
    })

    const subtotal = computed.reduce((s, l) => s + l.lineTotal, 0)
    const tax      = computed.reduce((s, l) => s + l.taxAmount, 0)
    const total    = subtotal + tax

    expect(subtotal).toBe(109000) // 100000 + 9000
    expect(tax).toBe(26080)       // 25000 + 1080
    expect(total).toBe(135080)
  })
})
