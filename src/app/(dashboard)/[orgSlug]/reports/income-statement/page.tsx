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

type IncomeStatementReport = {
  fromDate:      string
  toDate:        string
  sections:      Section[]
  totalRevenue:  string
  totalExpenses: string
  netIncome:     string
}

function fmtOre(str: string): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(str) / 100)
}

export default function IncomeStatementPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today = new Date().toISOString().slice(0, 10)
  const firstOfYear = `${new Date().getFullYear()}-01-01`

  const [fromDate, setFromDate] = useState(firstOfYear)
  const [toDate, setToDate]     = useState(today)
  const [report, setReport]     = useState<IncomeStatementReport | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/reports/income-statement?fromDate=${fromDate}&toDate=${toDate}`
      )
      if (!res.ok) throw new Error(await res.text())
      setReport(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid hämtning")
    } finally {
      setLoading(false)
    }
  }

  const netIncome = report ? Number(report.netIncome) / 100 : 0
  const netPositive = netIncome >= 0

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/reports`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Rapporter
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Resultatrapport</h1>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Konto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Namn</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Belopp</th>
              </tr>
            </thead>
            <tbody>
              {report.sections.map((section) => (
                <>
                  <tr key={`section-${section.title}`} className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.number} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-gray-500 text-xs">{row.number}</td>
                      <td className="px-4 py-2.5 text-gray-800">{row.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                        {fmtOre(row.displayBalance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-xs font-semibold text-gray-600">Summa {section.title}</td>
                    <td className="px-4 py-2 text-right font-mono text-sm font-semibold text-gray-800">
                      {fmtOre(section.subtotal)}
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="px-4 py-2" />
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-sm font-medium text-gray-700">Totala intäkter</td>
                <td className="px-4 py-3 text-right font-mono text-sm text-gray-800">{fmtOre(report.totalRevenue)}</td>
              </tr>
              <tr className="border-t border-gray-100 bg-gray-50">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-sm font-medium text-gray-700">Totala kostnader</td>
                <td className="px-4 py-3 text-right font-mono text-sm text-gray-800">{fmtOre(report.totalExpenses)}</td>
              </tr>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 font-bold text-gray-900">Årets resultat</td>
                <td className={`px-4 py-3 text-right font-mono font-bold text-base ${netPositive ? "text-green-700" : "text-red-700"}`}>
                  {fmtOre(report.netIncome)} kr
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
