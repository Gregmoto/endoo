"use client"
import { useState, useEffect } from "react"

type MonthData = { month: string; revenue: number }

function fmtMonth(m: string) {
  const [y, mo] = m.split("-")
  const d = new Date(Number(y), Number(mo) - 1, 1)
  return d.toLocaleDateString("sv-SE", { month: "short" })
}

function fmtMoney(n: number) {
  if (Math.abs(n) >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `${(n/1000).toFixed(0)}k`
  return String(Math.round(n))
}

export function RevenueChart({ orgSlug }: { orgSlug: string }) {
  const [data, setData] = useState<{ months: MonthData[]; mtd: number; ytd: number } | null>(null)

  useEffect(() => {
    fetch("/api/dashboard/revenue-chart?months=12")
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
  }, [])

  if (!data) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-foreground">Intäkter 12 mån</h2>
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  const maxVal = Math.max(...data.months.map(m => m.revenue), 1)

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Intäkter 12 mån</h2>
        <a href={`/${orgSlug}/reports`} className="text-xs text-primary hover:underline">Visa rapport →</a>
      </div>

      <div className="flex items-end gap-1 h-32">
        {data.months.map(m => {
          const pct = maxVal > 0 ? (m.revenue / maxVal * 100) : 0
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t transition-colors relative"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${fmtMonth(m.month)}: ${fmtMoney(m.revenue)} kr`}
              />
              <span className="text-[9px] text-muted-foreground">{fmtMonth(m.month)}</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-border/50">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">MTD</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">{fmtMoney(data.mtd)} kr</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">YTD</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">{fmtMoney(data.ytd)} kr</p>
        </div>
      </div>
    </div>
  )
}
