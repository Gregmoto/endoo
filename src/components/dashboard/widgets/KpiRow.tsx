"use client"
import { useState, useEffect } from "react"
import { KpiCard } from "./KpiCard"

type KpiData = {
  cash:        { value: number; label: string }
  receivable:  { value: number; count: number; hasOverdue: boolean }
  payable:     { value: number; count: number }
  monthResult: { value: number; changePercent: number | null }
}

export function KpiRow({ orgSlug }: { orgSlug: string }) {
  const [data, setData] = useState<KpiData | null>(null)

  useEffect(() => {
    fetch("/api/dashboard/kpis")
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
  }, [])

  const loading = !data

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Kassa"
        value={data?.cash.value ?? 0}
        href={`/${orgSlug}/accounts`}
        loading={loading}
      />
      <KpiCard
        label="Att få in"
        value={data?.receivable.value ?? 0}
        hint={data ? `${data.receivable.count} fakturor` : undefined}
        href={`/${orgSlug}/invoices?status=unpaid`}
        valueColor={data?.receivable.hasOverdue ? "red" : "default"}
        loading={loading}
      />
      <KpiCard
        label="Att betala ut"
        value={data?.payable.value ?? 0}
        hint={data ? `${data.payable.count} lev.fakturor` : undefined}
        href={`/${orgSlug}/supplier-invoices?status=approved`}
        loading={loading}
      />
      <KpiCard
        label="Månadens resultat"
        value={data?.monthResult.value ?? 0}
        hint={data?.monthResult.changePercent != null
          ? `${data.monthResult.changePercent > 0 ? "↑" : "↓"} ${Math.abs(data.monthResult.changePercent).toFixed(1)}% mot förra månaden`
          : undefined}
        href={`/${orgSlug}/reports/income-statement?period=current_month`}
        valueColor={data ? (data.monthResult.value >= 0 ? "green" : "red") : "default"}
        loading={loading}
      />
    </div>
  )
}
