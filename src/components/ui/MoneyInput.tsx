"use client"

import { useState, useCallback, useRef } from "react"
import { parseMoneyInput, formatMoneyInput } from "@/lib/format/money"

interface MoneyInputProps {
  /** Current value in öre as string (the "raw" controlled value for POST bodies) */
  value:       string
  onChange:    (öre: string) => void
  currency?:   string
  placeholder?: string
  disabled?:   boolean
  className?:  string
  id?:         string
  name?:       string
  /** Max allowed amount in öre */
  max?:        number
  /** Allow negative amounts */
  allowNegative?: boolean
  onBlur?:     () => void
}

/**
 * Money input that:
 * - Displays a formatted decimal value while the user types (e.g. "100,50")
 * - Emits öre as a string on change (e.g. "10050") — safe for POST bodies
 * - Accepts comma or dot as decimal separator
 * - Strips whitespace thousands separators on paste
 */
export function MoneyInput({
  value,
  onChange,
  currency  = "SEK",
  placeholder = "0,00",
  disabled,
  className,
  id,
  name,
  max,
  allowNegative = false,
  onBlur,
}: MoneyInputProps) {
  // Display string shown to the user while they edit
  const [display, setDisplay] = useState<string>(() =>
    value ? formatMoneyInput(value, currency) : "",
  )
  const isFocused = useRef(false)

  const handleFocus = useCallback(() => {
    isFocused.current = true
    // Show raw decimal for easier editing
    if (value) {
      const n = parseInt(value, 10)
      if (isFinite(n) && !isNaN(n)) {
        const abs  = Math.abs(n)
        const dec  = (abs / 100).toFixed(2).replace(".", ",")
        setDisplay(n < 0 ? `-${dec}` : dec)
      }
    }
  }, [value])

  const handleBlur = useCallback(() => {
    isFocused.current = false
    // Re-format nicely on blur
    if (display) {
      const öre = parseMoneyInput(display)
      if (öre !== null) {
        setDisplay(formatMoneyInput(öre, currency))
        onChange(öre)
      } else {
        // Invalid — reset to last known good value
        setDisplay(value ? formatMoneyInput(value, currency) : "")
      }
    } else {
      onChange("")
    }
    onBlur?.()
  }, [display, value, currency, onChange, onBlur])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setDisplay(raw)

      // Parse eagerly to give live feedback
      const öre = parseMoneyInput(raw)
      if (öre === null) return

      if (!allowNegative && parseInt(öre, 10) < 0) return
      if (max !== undefined && parseInt(öre, 10) > max) return

      onChange(öre)
    },
    [onChange, allowNegative, max],
  )

  // When value changes externally (not while focused), sync display
  const prevValue = useRef(value)
  if (!isFocused.current && prevValue.current !== value) {
    prevValue.current = value
    const next = value ? formatMoneyInput(value, currency) : ""
    if (next !== display) setDisplay(next)
  }

  const currencySymbol = currency === "SEK" ? "kr" : currency

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-label={`Belopp i ${currency}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
        {currencySymbol}
      </span>
    </div>
  )
}
