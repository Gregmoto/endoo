import { describe, it, expect } from "vitest"

// ─── Deduplication logic ───────────────────────────────────────────────────────
//
// The reminder cron must not send two emails to the same invoice on the same
// calendar day. It uses lastReminderAt compared against midnight of today.
// These tests verify the comparison logic in isolation.

function shouldSendReminder(
  lastReminderAt: Date | null,
  today: Date
): boolean {
  if (!lastReminderAt) return true           // never reminded
  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)
  return lastReminderAt < todayMidnight       // reminded on a previous day
}

const DAY = 86_400_000 // ms

describe("shouldSendReminder() deduplication", () => {
  const today = new Date("2026-05-16T08:00:00Z")

  it("sends when lastReminderAt is null", () => {
    expect(shouldSendReminder(null, today)).toBe(true)
  })

  it("sends when last reminder was yesterday", () => {
    const yesterday = new Date(today.getTime() - DAY)
    expect(shouldSendReminder(yesterday, today)).toBe(true)
  })

  it("sends when last reminder was a week ago", () => {
    const weekAgo = new Date(today.getTime() - 7 * DAY)
    expect(shouldSendReminder(weekAgo, today)).toBe(true)
  })

  it("does NOT send when already reminded today (morning)", () => {
    const todayEarly = new Date("2026-05-16T00:01:00Z")
    expect(shouldSendReminder(todayEarly, today)).toBe(false)
  })

  it("does NOT send when already reminded today (same time)", () => {
    expect(shouldSendReminder(today, today)).toBe(false)
  })

  it("does NOT send when reminded after midnight of today", () => {
    const justAfterMidnight = new Date("2026-05-16T00:00:01Z")
    expect(shouldSendReminder(justAfterMidnight, today)).toBe(false)
  })
})

// ─── Invoice type filter ───────────────────────────────────────────────────────
//
// Only regular invoices should receive reminders.
// Proforma and credit notes must be excluded.

type InvoiceType = "invoice" | "credit_note" | "proforma" | "quote"

function isReminderEligible(type: InvoiceType): boolean {
  return type === "invoice"
}

describe("reminder type eligibility", () => {
  it("regular invoices are eligible", () => {
    expect(isReminderEligible("invoice")).toBe(true)
  })

  it("credit notes are excluded", () => {
    expect(isReminderEligible("credit_note")).toBe(false)
  })

  it("proforma invoices are excluded", () => {
    expect(isReminderEligible("proforma")).toBe(false)
  })

  it("quotes are excluded", () => {
    expect(isReminderEligible("quote")).toBe(false)
  })
})

// ─── Overdue detection ────────────────────────────────────────────────────────

function isOverdue(dueDate: Date, today: Date): boolean {
  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)
  return dueDate < todayMidnight
}

describe("overdue detection", () => {
  const today = new Date("2026-05-16T10:00:00Z")

  it("marks invoice overdue when dueDate is yesterday", () => {
    const yesterday = new Date("2026-05-15T00:00:00Z")
    expect(isOverdue(yesterday, today)).toBe(true)
  })

  it("marks invoice overdue when dueDate is a month ago", () => {
    const monthAgo = new Date("2026-04-15T00:00:00Z")
    expect(isOverdue(monthAgo, today)).toBe(true)
  })

  it("does NOT mark overdue when dueDate is today", () => {
    const todayNoon = new Date("2026-05-16T00:00:00Z")
    expect(isOverdue(todayNoon, today)).toBe(false)
  })

  it("does NOT mark overdue when dueDate is in the future", () => {
    const tomorrow = new Date("2026-05-17T00:00:00Z")
    expect(isOverdue(tomorrow, today)).toBe(false)
  })
})

// ─── Combined eligibility ─────────────────────────────────────────────────────

describe("full reminder eligibility", () => {
  const today    = new Date("2026-05-16T09:00:00Z")
  const overDue  = new Date("2026-05-14T00:00:00Z")
  const notDue   = new Date("2026-05-20T00:00:00Z")
  const yesterday = new Date(today.getTime() - DAY)

  function eligible(invoice: {
    type: InvoiceType
    dueDate: Date
    lastReminderAt: Date | null
    status: string
  }): boolean {
    return (
      isReminderEligible(invoice.type) &&
      ["sent", "partial"].includes(invoice.status) &&
      isOverdue(invoice.dueDate, today) &&
      shouldSendReminder(invoice.lastReminderAt, today)
    )
  }

  it("eligible: regular invoice, overdue, never reminded", () => {
    expect(eligible({ type: "invoice", dueDate: overDue, lastReminderAt: null, status: "sent" })).toBe(true)
  })

  it("eligible: regular invoice, overdue, reminded yesterday", () => {
    expect(eligible({ type: "invoice", dueDate: overDue, lastReminderAt: yesterday, status: "partial" })).toBe(true)
  })

  it("ineligible: already reminded today", () => {
    expect(eligible({ type: "invoice", dueDate: overDue, lastReminderAt: today, status: "sent" })).toBe(false)
  })

  it("ineligible: not overdue", () => {
    expect(eligible({ type: "invoice", dueDate: notDue, lastReminderAt: null, status: "sent" })).toBe(false)
  })

  it("ineligible: proforma type", () => {
    expect(eligible({ type: "proforma", dueDate: overDue, lastReminderAt: null, status: "sent" })).toBe(false)
  })

  it("ineligible: credit note type", () => {
    expect(eligible({ type: "credit_note", dueDate: overDue, lastReminderAt: null, status: "sent" })).toBe(false)
  })

  it("ineligible: paid status", () => {
    expect(eligible({ type: "invoice", dueDate: overDue, lastReminderAt: null, status: "paid" })).toBe(false)
  })

  it("ineligible: draft status", () => {
    expect(eligible({ type: "invoice", dueDate: overDue, lastReminderAt: null, status: "draft" })).toBe(false)
  })
})
