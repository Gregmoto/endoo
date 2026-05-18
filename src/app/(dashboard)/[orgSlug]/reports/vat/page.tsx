"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type VatReport = {
  fromDate: string
  toDate:   string
  box05:    string
  box06:    string
  box07:    string
  box10:    string
  box11:    string
  box12:    string
  box48:    string
  box49:    string
}

function fmtOre(str: string): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(str) / 100)
}

function VatRow({
  box,
  label,
  value,
  bold,
  positive,
}: {
  box:      string
  label:    string
  value:    string
  bold?:    boolean
  positive?: boolean
}) {
  const num = Number(value)
  const color = positive !== undefined
    ? num > 0 ? "text-red-700" : "text-green-700"
    : "text-foreground"

  return (
    <div className={`flex items-center gap-4 px-4 py-3 border-b border ${bold ? "bg-muted" : ""}`}>
      <div className="w-16 text-xs font-mono font-semibold text-muted-foreground flex-shrink-0">Ruta {box}</div>
      <div className={`flex-1 text-sm ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{label}</div>
      <div className={`font-mono text-sm ${bold ? "font-bold text-base" : ""} ${color}`}>
        {fmtOre(value)} kr
      </div>
    </div>
  )
}

export default function VatPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today = new Date().toISOString().slice(0, 10)
  const firstOfYear = `${new Date().getFullYear()}-01-01`

  const [fromDate, setFromDate] = useState(firstOfYear)
  const [toDate, setToDate]     = useState(today)
  const [report, setReport]     = useState<VatReport | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/vat?fromDate=${fromDate}&toDate=${toDate}`)
      if (!res.ok) throw new Error(await res.text())
      setReport(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid hämtning")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/reports`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Rapporter
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-foreground">Momsrapport</h1>
      </div>

      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Från</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Till</label>
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
        <div className="bg-card border border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted border-b border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Momspliktiga försäljningar (underlag)
            </p>
          </div>
          <VatRow box="05" label="Momspliktiga försäljningar 25%"  value={report.box05} />
          <VatRow box="06" label="Momspliktiga försäljningar 12%"  value={report.box06} />
          <VatRow box="07" label="Momspliktiga försäljningar 6%"   value={report.box07} />

          <div className="px-4 py-3 bg-muted border-b border border-t border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Utgående moms</p>
          </div>
          <VatRow box="10" label="Utgående moms 25%" value={report.box10} />
          <VatRow box="11" label="Utgående moms 12%" value={report.box11} />
          <VatRow box="12" label="Utgående moms 6%"  value={report.box12} />

          <div className="px-4 py-3 bg-muted border-b border border-t border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingående moms</p>
          </div>
          <VatRow box="48" label="Ingående moms (avdragsgill)" value={report.box48} />

          <div className="border-t-2 border">
            <VatRow
              box="49"
              label={Number(report.box49) >= 0 ? "Moms att betala" : "Moms att få tillbaka"}
              value={report.box49}
              bold
              positive
            />
          </div>
        </div>
      )}
    </div>
  )
}
