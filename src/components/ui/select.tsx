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
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">{label}</label>
      )}
      <select
        id={selectId}
        className={cn(
          "block w-full rounded-lg border px-3 py-2 text-sm text-foreground bg-card",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
          error ? "border-destructive" : "border-input",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
