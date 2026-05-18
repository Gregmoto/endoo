"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

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

type SruGenerateState = "idle" | "loading" | "done" | "error"

export default function YearEndDownloadPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()
  const router = useRouter()

  const [data, setData]       = useState<ClosingStatements | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [sruType, setSruType]         = useState<"k2" | "k3" | "ink2">("ink2")
  const [sruState, setSruState]       = useState<SruGenerateState>("idle")
  const [sruError, setSruError]       = useState<string | null>(null)
  const [sruExportId, setSruExportId] = useState<string | null>(null)

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

  async function generateSru() {
    setSruState("loading")
    setSruError(null)
    try {
      const res  = await fetch("/api/accounting/sru/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fiscalYearId: id, type: sruType }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Generering misslyckades")
      setSruExportId(body.exportId)
      setSruState("done")
    } catch (e) {
      setSruError(e instanceof Error ? e.message : "Okänt fel")
      setSruState("error")
    }
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

          {/* SRU Export section */}
          <div className="mt-10 border rounded-xl p-6 bg-card">
            <h2 className="text-base font-semibold text-foreground mb-1">SRU-export (INK2-deklaration)</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Generera SRU-filer (INFO.SRU + BLANKETTER.SRU) för inlämning till Skatteverket.
            </p>

            {/* Disclaimer */}
            <div className="mb-5 p-4 border rounded-lg bg-amber-50 border-amber-200">
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Viktigt:</strong> SRU-genereringen är ett verktyg som hjälper dig förbereda
                underlag för Skatteverket. Du ansvarar för att kontrollera och granska filen innan
                inlämning. Endoo tar inget ansvar för felaktiga deklarationer. Verifiera alltid
                fältvärden mot aktuell blankett från Skatteverket.
              </p>
            </div>

            <div className="flex items-end gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Redovisningsregelverk
                </label>
                <select
                  value={sruType}
                  onChange={e => setSruType(e.target.value as "k2" | "k3" | "ink2")}
                  className="border rounded-lg px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ink2">INK2 (generell)</option>
                  <option value="k2">K2 — BFNAR 2016:10 (mindre företag)</option>
                  <option value="k3">K3 — BFNAR 2012:1 (större företag)</option>
                </select>
              </div>
              <button
                onClick={generateSru}
                disabled={sruState === "loading"}
                className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {sruState === "loading" ? "Genererar…" : "Generera SRU"}
              </button>
            </div>

            {sruError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3 mb-3">{sruError}</p>
            )}

            {sruState === "done" && sruExportId && (
              <div className="flex items-center gap-4 p-3 border rounded-lg bg-green-50 border-green-200">
                <p className="text-xs text-green-800 flex-1">
                  SRU-filen genererades. Ladda ner ZIP-arkivet nedan.
                </p>
                <a
                  href={`/api/accounting/sru/${sruExportId}/download`}
                  download
                  className="px-3 py-1.5 text-xs font-semibold border border-green-700 text-green-800 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Ladda ner ZIP
                </a>
                <Link
                  href={`/${orgSlug}/reports/sru-history`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Se historik
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
