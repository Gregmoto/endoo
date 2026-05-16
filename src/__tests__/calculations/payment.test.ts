import { describe, it, expect } from "vitest"

function balanceDue(totalAmount: bigint, paidAmount: bigint): bigint {
  return totalAmount - paidAmount
}

function isFullyPaid(totalAmount: bigint, paidAmount: bigint): boolean {
  return paidAmount >= totalAmount
}

function isOverpaid(totalAmount: bigint, paidAmount: bigint): boolean {
  return paidAmount > totalAmount
}

const B = BigInt

describe("balanceDue()", () => {
  it("returns full amount when nothing paid", () => {
    expect(balanceDue(B(10000), B(0))).toBe(B(10000))
  })

  it("returns zero when fully paid", () => {
    expect(balanceDue(B(10000), B(10000))).toBe(B(0))
  })

  it("returns remainder when partially paid", () => {
    expect(balanceDue(B(10000), B(3000))).toBe(B(7000))
  })

  it("returns negative when overpaid", () => {
    expect(balanceDue(B(10000), B(12000))).toBe(B(-2000))
  })
})

describe("isFullyPaid()", () => {
  it("returns true when paid amount equals total", () => {
    expect(isFullyPaid(B(10000), B(10000))).toBe(true)
  })

  it("returns true when overpaid", () => {
    expect(isFullyPaid(B(10000), B(12000))).toBe(true)
  })

  it("returns false when partially paid", () => {
    expect(isFullyPaid(B(10000), B(9999))).toBe(false)
  })

  it("returns false when not paid at all", () => {
    expect(isFullyPaid(B(10000), B(0))).toBe(false)
  })
})

describe("isOverpaid()", () => {
  it("returns true only when strictly over", () => {
    expect(isOverpaid(B(10000), B(10001))).toBe(true)
    expect(isOverpaid(B(10000), B(10000))).toBe(false)
    expect(isOverpaid(B(10000), B(9000))).toBe(false)
  })
})
