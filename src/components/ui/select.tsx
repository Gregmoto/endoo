import { cn } from "@/lib/utils"
import type { SelectHTMLAttributes } from "react"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <select
        id={selectId}
        className={cn(
          "block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
          error ? "border-red-400" : "border-gray-200",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
