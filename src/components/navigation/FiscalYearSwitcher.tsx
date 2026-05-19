"use client"

import { useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useFiscalYear } from "@/lib/navigation/use-fiscal-year"

interface Props {
  orgId: string
  className?: string
}

export function FiscalYearSwitcher({ orgId, className }: Props) {
  const { year, setYear } = useFiscalYear(orgId)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentCalYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentCalYear - 4 + i)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-accent transition-colors"
      >
        {year}
        <span className="text-muted-foreground text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-24 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => { setYear(y); setOpen(false) }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent",
                y === year ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
