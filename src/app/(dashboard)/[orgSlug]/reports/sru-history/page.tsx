"use client"

import { useEffect, useState } from "react"
import { useParams }           from "next/navigation"
import Link                    from "next/link"

type SruExportRow = {
  id:           string
  type:         "k2" | "k3" | "ink2"
  status:       "draft" | "final"
  taxYear:      number
  fiscalYear:   { name: string; endDate: string }
  generatedBy:  { fullName: string; email: string } | null
  createdAt:    string
}

const TYPE_LABEL: Record<string, string> = {
  k2:   "K2 (INK2R/INK2S)",
  k3:   "K3 (INK2R/INK2S)",
  ink2: "INK2",
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "Utkast",    cls: "text-amber-700 bg-amber-50" },
  final: { label: "Inlämnad", cls: "text-green-700 bg-green-50" },
}

export default function SruHistoryPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [rows, setRows]       = useState<SruExportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/accounting/sru")
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(() => setError("Kunde inte hämta SRU-exporthistorik"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">SRU-exporthistorik</h1>
          <p className="text-sm text-muted-foreground">
            Genererade SRU-filer för INK2-deklaration och årsredovisning.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/year-end`}
          className="text-sm text-brand-700 hover:underline"
        >
          Gå till årsavslut
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Laddar…</p>
      )}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-4">{error}</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="border rounded-xl p-8 text-center bg-card">
          <p className="text-sm text-muted-foreground mb-3">
            Inga SRU-exporter hittades.
          </p>
          <p className="text-xs text-muted-foreground">
            Generera en SRU-fil från <Link href={`/${orgSlug}/year-end`} className="underline">årsavslutsidan</Link>.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Räkenskapsår</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Genererad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Av</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const st = STATUS_LABEL[row.status] ?? { label: row.status, cls: "text-foreground bg-muted" }
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{row.fiscalYear.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[row.type] ?? row.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(row.createdAt).toLocaleDateString("sv-SE")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {row.generatedBy?.fullName ?? row.generatedBy?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/accounting/sru/${row.id}/download`}
                        className="text-xs text-brand-700 hover:underline font-medium"
                        download
                      >
                        Ladda ner ZIP
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
