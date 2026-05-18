"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter }             from "next/navigation"
import Link                                 from "next/link"
import { Card, CardContent }                from "@/components/ui/card"
import { Button }                           from "@/components/ui/button"

type Quote = {
  id:          string
  number:      string
  title:       string | null
  status:      string
  contactName: string
  currency:    string
  lineItems:   Array<{ unitPriceKr: number; quantity: number; taxRate: number; discountRate: number }>
  validUntil:  string | null
  createdAt:   string
  convertedToInvoiceId:  string | null
  convertedToContractId: string | null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:      { label: "Utkast",   cls: "bg-gray-100 text-gray-500" },
  sent:       { label: "Skickad",  cls: "bg-blue-100 text-blue-700" },
  viewed:     { label: "Visad",    cls: "bg-indigo-100 text-indigo-700" },
  accepted:   { label: "Godkänd", cls: "bg-green-100 text-green-700" },
  declined:   { label: "Avböjd",  cls: "bg-red-100 text-red-700" },
  expired:    { label: "Utgånget", cls: "bg-gray-100 text-gray-400" },
  cancelled:  { label: "Avbrutet", cls: "bg-gray-100 text-gray-400" },
  invoiced:   { label: "→ Faktura", cls: "bg-purple-100 text-purple-700" },
  contracted: { label: "→ Avtal",   cls: "bg-purple-100 text-purple-700" },
}

function calcTotal(q: Quote): number {
  return q.lineItems.reduce((sum, l) => {
    const net = l.quantity * (l.unitPriceKr ?? 0) * (1 - (l.discountRate ?? 0))
    return sum + net * (1 + (l.taxRate ?? 0))
  }, 0)
}

function fmtAmount(n: number, cur: string) {
  return `${n.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${cur}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE")
}

export default function QuotesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router      = useRouter()

  const [quotes,  setQuotes]  = useState<Quote[]>([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")
  const [status,  setStatus]  = useState("")
  const [page,    setPage]    = useState(1)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page) })
    if (search) qs.set("search", search)
    if (status) qs.set("status", status)
    const res = await fetch(`/api/quotes?${qs}`)
    if (res.ok) {
      const data = await res.json()
      setQuotes(data.quotes ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    }
    setLoading(false)
  }, [page, search, status])

  useEffect(() => { fetch_() }, [fetch_])
  useEffect(() => { setPage(1) }, [search, status])

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Offerter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} offerter totalt</p>
        </div>
        <Link href={`/${orgSlug}/quotes/new`}>
          <Button className="min-h-[44px] px-4">+ Ny offert</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input
          type="search"
          placeholder="Sök offert, kund…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:max-w-xs px-3 py-2.5 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full sm:w-auto px-3 py-2.5 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-card"
        >
          <option value="">Alla statusar</option>
          <option value="draft">Utkast</option>
          <option value="sent">Skickad</option>
          <option value="viewed">Visad</option>
          <option value="accepted">Godkänd</option>
          <option value="declined">Avböjd</option>
          <option value="expired">Utgånget</option>
          <option value="invoiced">→ Faktura</option>
          <option value="contracted">→ Avtal</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : quotes.length === 0 ? (
            <div className="py-16 text-center px-4">
              <p className="text-4xl mb-3">◧</p>
              <p className="font-medium text-foreground">Inga offerter hittades</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Skapa din första offert</p>
              <Link href={`/${orgSlug}/quotes/new`}>
                <Button className="min-h-[44px]">+ Ny offert</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Offert</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kund</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datum</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giltig t.o.m.</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Belopp</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => {
                      const st = STATUS[q.status] ?? { label: q.status, cls: "bg-gray-100 text-gray-500" }
                      return (
                        <tr
                          key={q.id}
                          className="border-t border-border/50 hover:bg-muted cursor-pointer"
                          onClick={() => router.push(`/${orgSlug}/quotes/${q.id}`)}
                        >
                          <td className="px-5 py-3 font-medium font-mono">{q.number}</td>
                          <td className="px-5 py-3 text-foreground">
                            <div>{q.contactName}</div>
                            {q.title && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{q.title}</div>}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{fmtDate(q.createdAt)}</td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {q.validUntil ? fmtDate(q.validUntil) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">
                            {fmtAmount(calcTotal(q), q.currency)}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/${orgSlug}/quotes/${q.id}`}
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
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-50">
                {quotes.map(q => {
                  const st = STATUS[q.status] ?? { label: q.status, cls: "bg-gray-100 text-gray-500" }
                  return (
                    <button
                      key={q.id}
                      className="w-full text-left px-4 py-3.5 hover:bg-muted active:bg-muted"
                      onClick={() => router.push(`/${orgSlug}/quotes/${q.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-muted-foreground">{q.number}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium leading-none ${st.cls}`}>{st.label}</span>
                          </div>
                          <p className="font-medium text-foreground text-sm truncate">{q.contactName}</p>
                          {q.title && <p className="text-xs text-muted-foreground truncate">{q.title}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(q.createdAt)}</p>
                        </div>
                        <p className="font-semibold text-foreground tabular-nums text-sm">
                          {fmtAmount(calcTotal(q), q.currency)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground gap-3">
          <span className="text-xs">Sida {page} av {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2.5 border border rounded-lg disabled:opacity-40 hover:bg-muted min-h-[44px]">
              ← Föregående
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-4 py-2.5 border border rounded-lg disabled:opacity-40 hover:bg-muted min-h-[44px]">
              Nästa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
