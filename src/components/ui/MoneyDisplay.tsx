"use client"

import { formatMoney } from "@/lib/format/money"

interface MoneyDisplayProps {
  /** öre as string, bigint, or number */
  amount:     string | bigint | number | null | undefined
  currency?:  string
  locale?:    string
  className?: string
  /** Show positive amounts with a + prefix */
  showSign?:  boolean
  /** When true, render a — for zero */
  blankZero?: boolean
}

export function MoneyDisplay({
  amount,
  currency = "SEK",
  locale,
  className,
  showSign = false,
  blankZero = false,
}: MoneyDisplayProps) {
  if (amount === null || amount === undefined || amount === "") {
    return <span className={className}>—</span>
  }

  const n =
    typeof amount === "bigint"
      ? Number(amount)
      : typeof amount === "string"
        ? parseInt(amount, 10)
        : amount

  if (blankZero && n === 0) {
    return <span className={className}>—</span>
  }

  const formatted = formatMoney(amount, currency, locale)
  const prefix = showSign && n > 0 ? "+" : ""

  return (
    <span className={className}>
      {prefix}{formatted}
    </span>
  )
}
