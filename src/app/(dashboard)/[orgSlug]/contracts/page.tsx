"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Contact = { id: string; name: string; customerNumber: string | null }
type Contract = {
  id: string
  contractNumber: string | null
  name: string
  status: string
  frequency: string
  startDate: string
  endDate: string | null
  nextIssueDate: string
  currency: string
  contact: Contact | null
  _count: { invoices: number }
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Utkast",  cls: "bg-gray-100 text-gray-500" },
  active:    { label: "Aktivt",  cls: "bg-green-100 text-green-700" },
  paused:    { label: "Pausat",  cls: "bg-yellow-100 text-yellow-700" },
  ended:     { label: "Avslutat",cls: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Avbrutet",cls: "bg-red-100 text-red-700" },
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "Veckovis", biweekly: "Varannan vecka",
  monthly: "Månadsvis", quarterly: "Kvartalsvis", yearly: "Årsvis",
}

export default function ContractsPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal]         = useState(0)
  const [pages, setPages]         = useState(1)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [status, setStatus]       = useState("")
  const [page, setPage]           = useState(1)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page) })
    if (search) qs.set("search", search)
    if (status) qs.set("status", status)
    const res = await fetch(`/api/contracts?${qs}`)
    if (res.ok) { const d = await res.json(); setContracts(d.contracts); setTotal(d.total); setPages(d.pages) }
    setLoading(false)
  }, [page, search, status])

  useEffect(() => { fetch_() }, [fetch_])
  useEffect(() => { setPage(1) }, [search, status])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avtalsfakturering</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} avtal totalt</p>
        </div>
        <Link href={`/${orgSlug}/contracts/new`}>
          <Button size="sm">+ Nytt avtal</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="search"
          placeholder="Sök avtalsnr, namn…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-card"
        >
          <option value="">Alla statusar</option>
          <option value="draft">Utkast</option>
          <option value="active">Aktivt</option>
          <option value="paused">Pausat</option>
          <option value="ended">Avslutat</option>
          <option value="cancelled">Avbrutet</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : contracts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">↺</p>
              <p className="font-medium text-foreground">Inga avtal hittades</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Skapa ditt första återkommande avtal</p>
              <Link href={`/${orgSlug}/contracts/new`}>
                <Button size="sm">+ Nytt avtal</Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avtal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kund</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Intervall</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nästa faktura</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fakturor</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => {
                  const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-border/50 hover:bg-muted cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/contracts/${c.id}`)}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        {c.contractNumber && <p className="text-xs text-muted-foreground font-mono">{c.contractNumber}</p>}
                      </td>
                      <td className="px-5 py-3 text-foreground">{c.contact?.name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-5 py-3 text-muted-foreground">{FREQ_LABELS[c.frequency] ?? c.frequency}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {c.status === "active" ? new Date(c.nextIssueDate).toLocaleDateString("sv-SE") : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{c._count.invoices}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/${orgSlug}/contracts/${c.id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Öppna →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Sida {page} av {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border rounded-lg disabled:opacity-40 hover:bg-muted">
              ← Föregående
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 border border rounded-lg disabled:opacity-40 hover:bg-muted">
              Nästa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
