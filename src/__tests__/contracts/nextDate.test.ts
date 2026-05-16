import { describe, it, expect } from "vitest"
import { nextDate } from "@/lib/contracts/utils"

describe("nextDate()", () => {
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

  it("weekly: adds 7 days", () => {
    expect(nextDate(d(2024, 1, 1), "weekly")).toEqual(d(2024, 1, 8))
    expect(nextDate(d(2024, 1, 28), "weekly")).toEqual(d(2024, 2, 4))
  })

  it("biweekly: adds 14 days", () => {
    expect(nextDate(d(2024, 1, 1), "biweekly")).toEqual(d(2024, 1, 15))
    expect(nextDate(d(2024, 1, 20), "biweekly")).toEqual(d(2024, 2, 3))
  })

  it("monthly: same day next month", () => {
    expect(nextDate(d(2024, 1, 15), "monthly")).toEqual(d(2024, 2, 15))
    expect(nextDate(d(2024, 11, 30), "monthly")).toEqual(d(2024, 12, 30))
  })

  it("monthly: January 31 → February overflow (browser Date behavior)", () => {
    // JS Date overflows month-end: Jan 31 + 1 month = Mar 2 (in leap year 2024)
    const result = nextDate(d(2024, 1, 31), "monthly")
    expect(result.getMonth()).toBe(2) // March (0-indexed: 2)
  })

  it("quarterly: adds 3 months", () => {
    expect(nextDate(d(2024, 1, 1), "quarterly")).toEqual(d(2024, 4, 1))
    expect(nextDate(d(2024, 10, 1), "quarterly")).toEqual(d(2025, 1, 1))
  })

  it("yearly: adds 1 year", () => {
    expect(nextDate(d(2024, 3, 15), "yearly")).toEqual(d(2025, 3, 15))
    expect(nextDate(d(2024, 2, 29), "yearly")).toEqual(d(2025, 3, 1)) // leap-year overflow
  })

  it("does not mutate the input date", () => {
    const original = d(2024, 6, 1)
    const copy = new Date(original)
    nextDate(original, "monthly")
    expect(original).toEqual(copy)
  })

  it("unknown frequency returns same date unchanged", () => {
    const input = d(2024, 6, 1)
    expect(nextDate(input, "daily")).toEqual(input)
  })
})
