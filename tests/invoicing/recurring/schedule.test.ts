import { describe, it, expect } from "vitest"
import { calculateNextIssueDate, generatePreviewSchedule } from "@/lib/invoicing/recurring/schedule"

// Use local midnight dates to avoid UTC-offset issues with Date string parsing
function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

describe("calculateNextIssueDate", () => {
  it("monthly from Jan 31 → Feb 28", () => {
    const result = calculateNextIssueDate(d(2026, 1, 31), "monthly")
    expect(sameDay(result, d(2026, 2, 28))).toBe(true)
  })

  it("monthly from Jan 31 in leap year 2024 → Feb 29", () => {
    const result = calculateNextIssueDate(d(2024, 1, 31), "monthly")
    expect(sameDay(result, d(2024, 2, 29))).toBe(true)
  })

  it("monthly from Feb 28 → Mar 28", () => {
    const result = calculateNextIssueDate(d(2026, 2, 28), "monthly")
    expect(sameDay(result, d(2026, 3, 28))).toBe(true)
  })

  it("monthly from Jan 15 → Feb 15", () => {
    const result = calculateNextIssueDate(d(2026, 1, 15), "monthly")
    expect(sameDay(result, d(2026, 2, 15))).toBe(true)
  })

  it("quarterly from Jan → Apr", () => {
    const result = calculateNextIssueDate(d(2026, 1, 15), "quarterly")
    expect(sameDay(result, d(2026, 4, 15))).toBe(true)
  })

  it("quarterly from Oct → Jan next year", () => {
    const result = calculateNextIssueDate(d(2026, 10, 15), "quarterly")
    expect(sameDay(result, d(2027, 1, 15))).toBe(true)
  })

  it("quarterly clamps Jan 31 to Apr 30", () => {
    const result = calculateNextIssueDate(d(2026, 1, 31), "quarterly")
    expect(sameDay(result, d(2026, 4, 30))).toBe(true)
  })

  it("halfyearly from Jun 30 → Dec 30", () => {
    const result = calculateNextIssueDate(d(2026, 6, 30), "halfyearly")
    expect(sameDay(result, d(2026, 12, 30))).toBe(true)
  })

  it("halfyearly from Aug 15 → Feb 15 next year", () => {
    const result = calculateNextIssueDate(d(2026, 8, 15), "halfyearly")
    expect(sameDay(result, d(2027, 2, 15))).toBe(true)
  })

  it("yearly preserves date", () => {
    const result = calculateNextIssueDate(d(2026, 5, 19), "yearly")
    expect(sameDay(result, d(2027, 5, 19))).toBe(true)
  })

  it("yearly handles Feb 29 → Feb 28 in non-leap year", () => {
    const result = calculateNextIssueDate(d(2024, 2, 29), "yearly")
    expect(sameDay(result, d(2025, 2, 28))).toBe(true)
  })

  it("weekly adds 7 days", () => {
    const result = calculateNextIssueDate(d(2026, 1, 1), "weekly")
    expect(sameDay(result, d(2026, 1, 8))).toBe(true)
  })

  it("biweekly adds 14 days", () => {
    const result = calculateNextIssueDate(d(2026, 1, 1), "biweekly")
    expect(sameDay(result, d(2026, 1, 15))).toBe(true)
  })

  it("custom 14 days", () => {
    const result = calculateNextIssueDate(d(2026, 1, 1), "custom", 14)
    expect(sameDay(result, d(2026, 1, 15))).toBe(true)
  })

  it("custom defaults to 30 days when no customDays given", () => {
    const result = calculateNextIssueDate(d(2026, 1, 1), "custom")
    expect(sameDay(result, d(2026, 1, 31))).toBe(true)
  })
})

describe("generatePreviewSchedule", () => {
  it("generates 5 monthly entries", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 6, 1),
      frequency: "monthly",
      count: 5,
    })
    expect(schedule).toHaveLength(5)
    expect(sameDay(schedule[0].date, d(2026, 6, 1))).toBe(true)
    expect(sameDay(schedule[1].date, d(2026, 7, 1))).toBe(true)
    expect(sameDay(schedule[2].date, d(2026, 8, 1))).toBe(true)
    expect(sameDay(schedule[3].date, d(2026, 9, 1))).toBe(true)
    expect(sameDay(schedule[4].date, d(2026, 10, 1))).toBe(true)
  })

  it("assigns correct period labels for monthly", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 1, 15),
      frequency: "monthly",
      count: 2,
    })
    expect(schedule[0].periodLabel).toContain("Januari")
    expect(schedule[1].periodLabel).toContain("Februari")
  })

  it("assigns sequential index", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 1, 1),
      frequency: "weekly",
      count: 3,
    })
    expect(schedule[0].index).toBe(0)
    expect(schedule[1].index).toBe(1)
    expect(schedule[2].index).toBe(2)
  })

  it("stops at maxInvoices", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 1, 1),
      frequency: "monthly",
      count: 10,
      maxInvoices: 3,
    })
    expect(schedule).toHaveLength(3)
  })

  it("stops at endDate", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 1, 1),
      frequency: "monthly",
      count: 10,
      endDate: d(2026, 3, 31),
    })
    expect(schedule).toHaveLength(3)
    expect(sameDay(schedule[schedule.length - 1].date, d(2026, 3, 1))).toBe(true)
  })

  it("generates quarterly entries correctly", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 1, 1),
      frequency: "quarterly",
      count: 4,
    })
    expect(sameDay(schedule[0].date, d(2026, 1, 1))).toBe(true)
    expect(sameDay(schedule[1].date, d(2026, 4, 1))).toBe(true)
    expect(sameDay(schedule[2].date, d(2026, 7, 1))).toBe(true)
    expect(sameDay(schedule[3].date, d(2026, 10, 1))).toBe(true)
  })

  it("generates weekly entries correctly", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 1, 5),
      frequency: "weekly",
      count: 3,
    })
    expect(sameDay(schedule[0].date, d(2026, 1, 5))).toBe(true)
    expect(sameDay(schedule[1].date, d(2026, 1, 12))).toBe(true)
    expect(sameDay(schedule[2].date, d(2026, 1, 19))).toBe(true)
  })

  it("returns empty array when count is 0", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 1, 1),
      frequency: "monthly",
      count: 0,
    })
    expect(schedule).toHaveLength(0)
  })

  it("stops immediately when startDate exceeds endDate", () => {
    const schedule = generatePreviewSchedule({
      startDate: d(2026, 6, 1),
      frequency: "monthly",
      count: 5,
      endDate: d(2026, 5, 1),
    })
    expect(schedule).toHaveLength(0)
  })
})
