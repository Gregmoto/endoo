"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Contact = { id: string; name: string; customerNumber: string | null }
type Schedule = {
  id:             string
  contractNumber: string | null
  name:           string
  title:          string | null
  status:         string
  frequency:      string
  startDate:      string
  endDate:        string | null
  nextIssueDate:  string
  lastIssuedAt:   string | null
  currency:       string
  autoSendMethod: string
  issuedCount:    number
  maxInvoices:    number | null
  contact:        Contact | null
  lineTotal:      number
  createdAt:      string
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:  { label: "Aktiv",    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  paused:  { label: "Pausad",   cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  draft:   { label: "Utkast",   cls: "bg-muted text-muted-foreground" },
  ended:   { label: "Avslutad", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
}

const FREQ_LABELS: Record<string, string> = {
  weekly:      "Veckovis",
  biweekly:    "Varannan vecka",
  monthly:     "Månadsvis",
  quarterly:   "Kvartalsvis",
  halfyearly:  "Halvår",
  yearly:      "Årsvis",
  custom:      "Anpassad",
}

const TABS = [
  { key: "active",  label: "Aktiva" },
  { key: "paused",  label: "Pausade" },
  { key: "ended",   label: "Avslutade" },
  { key: "draft",   label: "Utkast" },
]

function fmt(kr: number) {
  return (kr / 100).toLocaleString("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 })
}

export default function RecurringPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [tab, setTab]       = useState("active")
  const [search, setSearch] = useState("")
  const [page, setPage]     = useState(1)

  const [data, setData]         = useState<Schedule[]>([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts]     = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)

  const [actionId, setActionId]   = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ tab, page: String(page) })
    if (search) qs.set("q", search)
    const res = await fetch(`/api/recurring?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setData(d.data ?? [])
      setTotal(d.pagination?.total ?? 0)
      setTotalPages(d.pagination?.totalPages ?? 1)
      setCounts(d.counts ?? {})
    }
    setLoading(false)
  }, [tab, page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [tab, search])

  async function doAction(id: string, action: "pause" | "resume" | "end" | "generate-now") {
    setActionId(id)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/recurring/${id}/${action}`, { method: "POST" })
      if (res.ok) {
        if (action === "generate-now") {
          const d = await res.json()
          router.push(`/${orgSlug}/invoices/${d.invoiceId}`)
          return
        }
        await load()
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.message ?? "Något gick fel")
      }
    } finally {
      setActionId(null)
      setActionLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">Avtalsfakturering</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} avtal</p>
        </div>
        <Link href={`/${orgSlug}/recurring/new`}>
          <Button size="sm">+ Nytt avtal</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {counts[t.key] != null && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Sök avtalsnr, namn, titel…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">↺</p>
              <p className="font-medium text-foreground">Inga avtal</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Skapa ditt första avtal</p>
              <Link href={`/${orgSlug}/recurring/new`}>
                <Button size="sm">+ Nytt avtal</Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avtal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kund</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frekvens</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nästa faktura</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Belopp</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.map(s => {
                  const st = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.draft
                  const isActing = actionLoading && actionId === s.id
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-border/50 hover:bg-muted cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/recurring/${s.id}`)}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{s.title ?? s.name}</p>
                        {s.contractNumber && (
                          <p className="text-xs text-muted-foreground font-mono">{s.contractNumber}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-foreground">
                        {s.contact?.name ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {FREQ_LABELS[s.frequency] ?? s.frequency}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {s.status === "active"
                          ? new Date(s.nextIssueDate).toLocaleDateString("sv-SE")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-foreground">
                        {fmt(s.lineTotal)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/${orgSlug}/recurring/${s.id}`}
                            className="px-2 py-1 text-xs rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          >
                            Visa
                          </Link>
                          {s.status === "active" && (
                            <>
                              <button
                                onClick={() => doAction(s.id, "pause")}
                                disabled={isActing}
                                className="px-2 py-1 text-xs rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40"
                              >
                                Pausa
                              </button>
                              <button
                                onClick={() => doAction(s.id, "generate-now")}
                                disabled={isActing}
                                className="px-2 py-1 text-xs rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40"
                              >
                                Skapa nu
                              </button>
                            </>
                          )}
                          {s.status === "paused" && (
                            <button
                              onClick={() => doAction(s.id, "resume")}
                              disabled={isActing}
                              className="px-2 py-1 text-xs rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              Återuppta
                            </button>
                          )}
                          {(s.status === "active" || s.status === "paused") && (
                            <button
                              onClick={() => {
                                if (confirm("Avsluta avtalet?")) doAction(s.id, "end")
                              }}
                              disabled={isActing}
                              className="px-2 py-1 text-xs rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              Avsluta
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Sida {page} av {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-input rounded-lg disabled:opacity-40 hover:bg-muted"
            >
              ← Föregående
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-input rounded-lg disabled:opacity-40 hover:bg-muted"
            >
              Nästa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
