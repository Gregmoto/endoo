"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type TrialBalanceRow = {
  accountId:      string
  number:         string
  name:           string
  type:           string
  debit:          string
  credit:         string
  net:            string
  displayBalance: string
}

type TrialBalanceReport = {
  fromDate:    string
  toDate:      string
  rows:        TrialBalanceRow[]
  totalDebit:  string
  totalCredit: string
  balanced:    boolean
}

function fmtOre(str: string): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(str) / 100)
}

function getClass(number: string): string {
  return number.charAt(0)
}

const CLASS_LABELS: Record<string, string> = {
  "1": "Klass 1 — Tillgångar",
  "2": "Klass 2 — Skulder och eget kapital",
  "3": "Klass 3 — Rörelsens intäkter",
  "4": "Klass 4 — Material och varor",
  "5": "Klass 5 — Övriga externa kostnader",
  "6": "Klass 6 — Övriga externa kostnader",
  "7": "Klass 7 — Personalkostnader",
  "8": "Klass 8 — Finansiella och andra inkomster/utgifter",
}

export default function TrialBalancePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today = new Date().toISOString().slice(0, 10)
  const firstOfYear = `${new Date().getFullYear()}-01-01`

  const [fromDate, setFromDate] = useState(firstOfYear)
  const [toDate, setToDate]     = useState(today)
  const [report, setReport]     = useState<TrialBalanceReport | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/reports/trial-balance?fromDate=${fromDate}&toDate=${toDate}`
      )
      if (!res.ok) throw new Error(await res.text())
      setReport(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid hämtning")
    } finally {
      setLoading(false)
    }
  }

  const grouped = report
    ? report.rows.reduce<Record<string, TrialBalanceRow[]>>((acc, row) => {
        const cls = getClass(row.number)
        if (!acc[cls]) acc[cls] = []
        acc[cls].push(row)
        return acc
      }, {})
    : {}

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/reports`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Rapporter
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Provbalans</h1>
      </div>

      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Från</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Till</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Kontonr</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kontonamn</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Debet</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Kredit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(grouped)
                .sort()
                .map((cls) => (
                  <>
                    <tr key={`cls-${cls}`} className="bg-gray-50 border-t border-gray-100">
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {CLASS_LABELS[cls] ?? `Klass ${cls}`}
                      </td>
                    </tr>
                    {grouped[cls].map((row) => (
                      <tr key={row.accountId} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-gray-500 text-xs">{row.number}</td>
                        <td className="px-4 py-2.5 text-gray-800">{row.name}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                          {row.debit !== "0" ? fmtOre(row.debit) : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                          {row.credit !== "0" ? fmtOre(row.credit) : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                          {fmtOre(row.net)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-gray-700">Totalt</td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{fmtOre(report.totalDebit)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{fmtOre(report.totalCredit)}</td>
                <td className="px-4 py-3 text-right">
                  {report.balanced ? (
                    <span className="text-green-600 text-xs font-medium">✓ Balanserad</span>
                  ) : (
                    <span className="text-red-600 text-xs font-medium">✗ Ej balanserad</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
