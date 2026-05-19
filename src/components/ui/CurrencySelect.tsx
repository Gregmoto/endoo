"use client"

import { useCurrencies } from "@/lib/hooks/use-currencies"

interface Props {
  value:       string
  onChange:    React.ChangeEventHandler<HTMLSelectElement>
  className?:  string
  disabled?:   boolean
  placeholder?: string
}

export function CurrencySelect({ value, onChange, className, disabled, placeholder }: Props) {
  const { currencies, isLoading } = useCurrencies()

  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled || isLoading}
      className={className}
    >
      {placeholder && !value && <option value="">{placeholder}</option>}
      {currencies.map(c => (
        <option key={c.code} value={c.code}>
          {c.code}{c.symbol ? ` (${c.symbol})` : ""}{c.isDefault ? " — standard" : ""}
        </option>
      ))}
    </select>
  )
}
