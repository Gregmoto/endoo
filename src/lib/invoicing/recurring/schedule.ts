export type RecurringFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "halfyearly"
  | "yearly"
  | "custom"

export function calculateNextIssueDate(
  current: Date,
  frequency: RecurringFrequency,
  customDays?: number,
): Date {
  const d = new Date(current)

  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7)
      break

    case "biweekly":
      d.setDate(d.getDate() + 14)
      break

    case "monthly": {
      const targetDay = d.getDate()
      const targetMonth = d.getMonth()
      const targetYear = d.getFullYear()
      const nextMonth = targetMonth + 1
      const nextYear = nextMonth > 11 ? targetYear + 1 : targetYear
      const normalizedMonth = nextMonth % 12
      const maxDay = new Date(nextYear, normalizedMonth + 1, 0).getDate()
      d.setFullYear(nextYear, normalizedMonth, Math.min(targetDay, maxDay))
      break
    }

    case "quarterly": {
      const targetDay = d.getDate()
      const targetMonth = d.getMonth()
      const targetYear = d.getFullYear()
      const nextMonthRaw = targetMonth + 3
      const nextYear = targetYear + Math.floor(nextMonthRaw / 12)
      const normalizedMonth = nextMonthRaw % 12
      const maxDay = new Date(nextYear, normalizedMonth + 1, 0).getDate()
      d.setFullYear(nextYear, normalizedMonth, Math.min(targetDay, maxDay))
      break
    }

    case "halfyearly": {
      const targetDay = d.getDate()
      const targetMonth = d.getMonth()
      const targetYear = d.getFullYear()
      const nextMonthRaw = targetMonth + 6
      const nextYear = targetYear + Math.floor(nextMonthRaw / 12)
      const normalizedMonth = nextMonthRaw % 12
      const maxDay = new Date(nextYear, normalizedMonth + 1, 0).getDate()
      d.setFullYear(nextYear, normalizedMonth, Math.min(targetDay, maxDay))
      break
    }

    case "yearly": {
      const targetDay = d.getDate()
      const targetMonth = d.getMonth()
      const nextYear = d.getFullYear() + 1
      // Handle Feb 29 in leap year → Feb 28 in non-leap year
      if (targetMonth === 1 && targetDay === 29) {
        const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
        const clampedDay = isLeap(nextYear) ? 29 : 28
        d.setFullYear(nextYear, 1, clampedDay)
      } else {
        d.setFullYear(nextYear)
      }
      break
    }

    case "custom":
      d.setDate(d.getDate() + (customDays ?? 30))
      break
  }

  return d
}

const SWEDISH_MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
]

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatPeriodLabel(date: Date, frequency: RecurringFrequency): string {
  const year  = date.getFullYear()
  const month = date.getMonth()

  switch (frequency) {
    case "weekly":
    case "biweekly":
      return `${year} v.${getISOWeek(date)}`

    case "quarterly": {
      const q = Math.floor(month / 3) + 1
      return `Kvartal ${q} ${year}`
    }

    case "halfyearly": {
      const half = month < 6 ? 1 : 2
      return `Halvår ${half} ${year}`
    }

    case "yearly":
      return `${year}`

    default:
      return `${SWEDISH_MONTHS[month]} ${year}`
  }
}

export interface ScheduleEntry {
  date: Date
  periodLabel: string
  index: number
}

export function generatePreviewSchedule(params: {
  startDate: Date
  frequency: RecurringFrequency
  customDays?: number
  endDate?: Date
  maxInvoices?: number
  count: number
}): ScheduleEntry[] {
  const { startDate, frequency, customDays, endDate, maxInvoices, count } = params
  const entries: ScheduleEntry[] = []
  let current = new Date(startDate)

  for (let i = 0; i < count; i++) {
    if (maxInvoices !== undefined && i >= maxInvoices) break
    if (endDate && current > endDate) break

    entries.push({
      date: new Date(current),
      periodLabel: formatPeriodLabel(current, frequency),
      index: i,
    })

    current = calculateNextIssueDate(current, frequency, customDays)
  }

  return entries
}
