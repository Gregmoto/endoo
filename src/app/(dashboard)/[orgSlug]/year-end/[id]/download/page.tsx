"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

type AccountSnapshot = {
  accountNumber: string
  accountName:   string
  balance:       string
  debit:         string
  credit:        string
}

type ClosingStatements = {
  fiscalYear: {
    id:          string
    name:        string
    startDate:   string
    endDate:     string
    closedAt:    string
    closingHash: string
    closedBy:    { fullName: string; email: string } | null
  }
  balanceSheet:    AccountSnapshot[]
  incomeStatement: AccountSnapshot[]
}

function fmtOre(str: string): string {
  const n = Number(str) / 100
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(n)
}

function SnapshotTable({
  title,
  rows,
}: {
  title: string
  rows:  AccountSnapshot[]
}) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted">
              <th className="px-3 py-2 text-left text-muted-foreground font-medium">Konto</th>
              <th className="px-3 py-2 text-left text-muted-foreground font-medium">Namn</th>
              <th className="px-3 py-2 text-right text-muted-foreground font-medium">Debet</th>
              <th className="px-3 py-2 text-right text-muted-foreground font-medium">Kredit</th>
              <th className="px-3 py-2 text-right text-muted-foreground font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-3 py-2 font-mono text-muted-foreground">{row.accountNumber}</td>
                <td className="px-3 py-2 text-foreground">{row.accountName}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {row.debit !== "0" ? fmtOre(row.debit) : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {row.credit !== "0" ? fmtOre(row.credit) : ""}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums font-medium ${
                  Number(row.balance) < 0 ? "text-red-600" : "text-foreground"
                }`}>
                  {fmtOre(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function YearEndDownloadPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()
  const router = useRouter()

  const [data, setData]       = useState<ClosingStatements | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/accounting/fiscal-years/${id}/year-end/closing-statements`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError("Kunde inte hämta bokslutsuppgifter"))
      .finally(() => setLoading(false))
  }, [id])

  async function downloadJson() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `bokslut-${data.fiscalYear.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => router.push(`/${orgSlug}/year-end`)}
        className="text-xs text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
      >
        ← Tillbaka
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Bokslut {data?.fiscalYear.name ?? ""}
          </h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              Avslutat {new Date(data.fiscalYear.closedAt).toLocaleDateString("sv-SE")}
              {data.fiscalYear.closedBy && ` av ${data.fiscalYear.closedBy.fullName || data.fiscalYear.closedBy.email}`}
            </p>
          )}
        </div>
        {data && (
          <button
            onClick={downloadJson}
            className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted transition-colors text-foreground flex-shrink-0"
          >
            Ladda ner JSON
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Laddar bokslutsdata…</p>}
      {error   && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-4">{error}</p>}

      {data && (
        <>
          {/* Integrity hash */}
          <div className="mb-8 p-4 border rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Integritetshash (SHA-256)</p>
            <p className="text-xs font-mono text-foreground break-all">{data.fiscalYear.closingHash}</p>
          </div>

          <SnapshotTable title="Balansräkning" rows={data.balanceSheet} />
          <SnapshotTable title="Resultaträkning" rows={data.incomeStatement} />
        </>
      )}
    </div>
  )
}
