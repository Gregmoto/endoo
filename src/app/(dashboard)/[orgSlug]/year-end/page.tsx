"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type FiscalYear = {
  id:        string
  name:      string
  startDate: string
  endDate:   string
  status:    "open" | "closed" | "locked"
  isDefault: boolean
  closedAt?: string | null
  closedBy?: { fullName: string; email: string } | null
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open:   { label: "Öppet",    cls: "text-green-700 bg-green-50" },
  closed: { label: "Avslutat", cls: "text-muted-foreground bg-muted" },
  locked: { label: "Låst",     cls: "text-foreground bg-muted" },
}

export default function YearEndOverviewPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [years, setYears]     = useState<FiscalYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/accounting/journals?type=fiscal-years")
      .then(() => fetch("/api/accounting/periods?includeFiscalYear=true"))
      .catch(() => null)

    fetch("/api/accounting/fiscal-years")
      .then(r => r.json())
      .then(data => setYears(Array.isArray(data) ? data : []))
      .catch(() => setError("Kunde inte hämta räkenskapsår"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Årsavslut</h1>
        <p className="text-sm text-muted-foreground">
          Stäng ett räkenskapsår, granska bokslutet och ladda ner rapportpaketet.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Laddar räkenskapsår…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-4">{error}</div>
      )}

      {!loading && !error && years.length === 0 && (
        <div className="text-sm text-muted-foreground">Inga räkenskapsår hittades.</div>
      )}

      <div className="space-y-3">
        {years.map(fy => {
          const st = STATUS_LABEL[fy.status] ?? { label: fy.status, cls: "text-foreground bg-muted" }
          return (
            <div
              key={fy.id}
              className="border rounded-xl p-5 flex items-center justify-between gap-4 bg-card"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{fy.name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(fy.startDate).toLocaleDateString("sv-SE")} –{" "}
                  {new Date(fy.endDate).toLocaleDateString("sv-SE")}
                </p>
                {fy.status === "closed" && fy.closedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Avslutat {new Date(fy.closedAt).toLocaleDateString("sv-SE")}
                    {fy.closedBy && ` av ${fy.closedBy.fullName || fy.closedBy.email}`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {fy.status === "open" && (
                  <Link
                    href={`/${orgSlug}/year-end/${fy.id}/wizard`}
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    Stäng räkenskapsår
                  </Link>
                )}
                {fy.status === "closed" && (
                  <Link
                    href={`/${orgSlug}/year-end/${fy.id}/download`}
                    className="px-4 py-2 text-xs font-semibold text-foreground border rounded-lg hover:bg-muted transition-colors"
                  >
                    Ladda ner bokslut
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
