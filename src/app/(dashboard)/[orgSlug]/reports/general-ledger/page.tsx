"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type LedgerEntry = {
  entryId:        string
  journalId:      string
  reference:      string
  date:           string
  description:    string
  accountId:      string
  accountNumber:  string
  accountName:    string
  debit:          string
  credit:         string
  vatCode:        string | null
  runningBalance: string
}

type AccountLedger = {
  accountId:      string
  accountNumber:  string
  accountName:    string
  openingBalance: string
  entries:        LedgerEntry[]
  closingBalance: string
}

type GeneralLedgerReport = {
  fromDate:       string
  toDate:         string
  accountEntries: AccountLedger[]
}

function fmtOre(str: string): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(str) / 100)
}

function fmtDate(dateStr: string): string {
  return dateStr.slice(0, 10)
}

export default function GeneralLedgerPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today = new Date().toISOString().slice(0, 10)
  const firstOfYear = `${new Date().getFullYear()}-01-01`

  const [fromDate, setFromDate]     = useState(firstOfYear)
  const [toDate, setToDate]         = useState(today)
  const [accountFilter, setAcctFilter] = useState("")
  const [report, setReport]         = useState<GeneralLedgerReport | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ fromDate, toDate })
      if (accountFilter.trim()) params.set("accountNumbers", accountFilter.trim())
      const res = await fetch(`/api/reports/general-ledger?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      setReport(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid hämtning")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/reports`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Rapporter
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-foreground">Huvudbok</h1>
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Konton (kommaseparerat, tomt = alla)</label>
          <input
            type="text"
            value={accountFilter}
            onChange={(e) => setAcctFilter(e.target.value)}
            placeholder="t.ex. 1510,3001"
            className="border border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-52"
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

      {report && report.accountEntries.length === 0 && (
        <p className="text-sm text-muted-foreground">Inga verifikat hittades för perioden.</p>
      )}

      {report && report.accountEntries.map((acct) => (
        <div key={acct.accountId} className="mb-8 bg-card border border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted border-b border flex items-center gap-3">
            <span className="font-mono font-bold text-foreground">{acct.accountNumber}</span>
            <span className="font-semibold text-foreground">{acct.accountName}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              IB: <span className="font-mono">{fmtOre(acct.openingBalance)}</span>
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground w-28">Datum</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground w-24">Verifikat</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Beskrivning</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground w-32">Debet</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground w-32">Kredit</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground w-36">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {acct.entries.map((entry) => (
                <tr key={entry.entryId} className="border-t border-border/50 hover:bg-muted">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{fmtDate(entry.date)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{entry.reference}</td>
                  <td className="px-4 py-2 text-foreground truncate max-w-xs">{entry.description}</td>
                  <td className="px-4 py-2 text-right font-mono text-foreground">
                    {entry.debit !== "0" ? fmtOre(entry.debit) : ""}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-foreground">
                    {entry.credit !== "0" ? fmtOre(entry.credit) : ""}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-foreground">{fmtOre(entry.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border bg-muted font-semibold">
                <td colSpan={5} className="px-4 py-2.5 text-sm text-foreground">Utgående saldo</td>
                <td className="px-4 py-2.5 text-right font-mono text-foreground">{fmtOre(acct.closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ))}
    </div>
  )
}
