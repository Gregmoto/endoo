"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type AccountRow = {
  number:         string
  name:           string
  type:           string
  displayBalance: string
}

type Section = {
  title:    string
  rows:     AccountRow[]
  subtotal: string
}

type BalanceSheetReport = {
  toDate:           string
  sections:         Section[]
  totalAssets:      string
  totalLiabilities: string
  totalEquity:      string
  balanced:         boolean
}

function fmtOre(str: string): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(str) / 100)
}

export default function BalanceSheetPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today = new Date().toISOString().slice(0, 10)
  const firstOfYear = `${new Date().getFullYear()}-01-01`

  const [toDate, setToDate]     = useState(today)
  const [fromDate, setFromDate] = useState(firstOfYear)
  const [report, setReport]     = useState<BalanceSheetReport | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/reports/balance-sheet?toDate=${toDate}&fromDate=${fromDate}`
      )
      if (!res.ok) throw new Error(await res.text())
      setReport(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid hämtning")
    } finally {
      setLoading(false)
    }
  }

  const assetSections     = report?.sections.filter((s) => s.rows.some((r) => r.type === "asset"))     ?? []
  const liabSections      = report?.sections.filter((s) => s.rows.some((r) => r.type === "liability")) ?? []
  const equitySections    = report?.sections.filter((s) => s.rows.some((r) => r.type === "equity"))    ?? []

  function renderSection(section: Section) {
    return (
      <div key={section.title} className="mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5 bg-muted rounded">
          {section.title}
        </div>
        {section.rows.map((row) => (
          <div key={row.number} className="flex justify-between items-center px-2 py-1.5 hover:bg-muted rounded text-sm">
            <span className="text-foreground">
              <span className="font-mono text-xs text-muted-foreground mr-2">{row.number}</span>
              {row.name}
            </span>
            <span className="font-mono text-foreground">{fmtOre(row.displayBalance)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center px-2 py-1.5 border-t border mt-1">
          <span className="text-xs font-semibold text-muted-foreground">Summa {section.title}</span>
          <span className="font-mono font-semibold text-sm text-foreground">{fmtOre(section.subtotal)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/reports`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Rapporter
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-foreground">Balansrapport</h1>
      </div>

      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Räkenskapsår från (för årets resultat)</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Balansdatum</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Hämtar…" : "Kör rapport"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-4 text-base">Tillgångar</h2>
              {assetSections.map(renderSection)}
              <div className="flex justify-between items-center px-2 py-2 border-t-2 border mt-2">
                <span className="font-bold text-foreground">Summa tillgångar</span>
                <span className="font-mono font-bold text-foreground">{fmtOre(report.totalAssets)}</span>
              </div>
            </div>

            <div className="bg-card border border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-4 text-base">Skulder &amp; Eget kapital</h2>
              {liabSections.map(renderSection)}
              {equitySections.map(renderSection)}
              <div className="flex justify-between items-center px-2 py-2 border-t-2 border mt-2">
                <span className="font-bold text-foreground">Summa skulder &amp; EK</span>
                <span className="font-mono font-bold text-foreground">
                  {fmtOre(
                    String(BigInt(report.totalLiabilities) + BigInt(report.totalEquity))
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {report.balanced ? (
              <span className="text-sm text-green-600 font-medium">✓ Balansen stämmer</span>
            ) : (
              <span className="text-sm text-red-600 font-medium">✗ Balansen stämmer inte</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
