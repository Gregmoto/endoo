"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Article = {
  id: string
  sku: string | null
  name: string
  description: string | null
  type: "product" | "service"
  isActive: boolean
  isStockItem: boolean
  isPhasingOut: boolean
  unitPrice: number
  currency: string
  averageCost: number
  stockQuantity: number
  reservedQuantity: number
  availableQuantity: number
  inventoryValue: number
  vatType: string | null
  salesAccount: string | null
  manufacturer: string | null
  ean: string | null
}

type Tabs = { all: number; stock: number; service: number; phasing: number; inactive: number }
type Tab  = keyof Tabs

const TAB_LABELS: Record<Tab, string> = {
  all:      "Alla",
  stock:    "Lagervaror",
  service:  "Tjänster",
  phasing:  "Utgående",
  inactive: "Inaktiva",
}

function fmtPrice(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr"
}

function calcTG(unitPrice: number, averageCost: number): number | null {
  if (!unitPrice) return null
  return ((unitPrice - averageCost) / unitPrice) * 100
}

function TGCell({ unitPrice, averageCost }: { unitPrice: number; averageCost: number }) {
  const tg = calcTG(unitPrice, averageCost)
  if (tg === null) return <span className="text-muted-foreground">—</span>
  const cls = tg < 10 ? "text-destructive" : tg <= 25 ? "text-muted-foreground" : "text-primary"
  return <span className={cls}>{tg.toFixed(1)}%</span>
}

function StatusBadge({ article }: { article: Article }) {
  if (!article.isActive)     return <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-muted text-muted-foreground">Inaktiv</span>
  if (article.isPhasingOut)  return <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-accent text-foreground">Utgående</span>
  return <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-primary/10 text-primary">Aktiv</span>
}

function isEan13(s: string): boolean {
  if (!/^\d{13}$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += parseInt(s[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (sum % 10)) % 10 === parseInt(s[12])
}

const LIMIT_KEY = "articles_page_limit"

export default function ArticlesPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [articles, setArticles]       = useState<Article[]>([])
  const [tabs, setTabs]               = useState<Tabs>({ all: 0, stock: 0, service: 0, phasing: 0, inactive: 0 })
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [total, setTotal]             = useState(0)
  const [pages, setPages]             = useState(1)
  const [loading, setLoading]         = useState(true)

  const [search, setSearch]           = useState("")
  const [tab, setTab]                 = useState<Tab>("all")
  const [manufacturer, setManufacturer] = useState("")
  const [page, setPage]               = useState(1)
  const [sort, setSort]               = useState("name")
  const [order, setOrder]             = useState<"asc" | "desc">("asc")
  const [limit, setLimit]             = useState<number>(() => {
    if (typeof window === "undefined") return 25
    return parseInt(localStorage.getItem(LIMIT_KEY) ?? "25") || 25
  })

  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [rowMenu, setRowMenu]         = useState<string | null>(null)
  const searchTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit), sort, order, tab })
    if (search)       qs.set("search", search)
    if (manufacturer) qs.set("manufacturer", manufacturer)
    const res = await fetch(`/api/articles?${qs}`)
    if (res.ok) {
      const data = await res.json()
      setArticles(data.articles)
      setTotal(data.pagination.total)
      setPages(data.pagination.pages)
      setTabs(data.tabs)
      setManufacturers(data.manufacturers)
    }
    setLoading(false)
  }, [page, limit, sort, order, tab, search, manufacturer])

  useEffect(() => { fetchArticles() }, [fetchArticles])
  useEffect(() => { setPage(1) }, [search, tab, manufacturer, limit])

  function handleSearchChange(val: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (isEan13(val.trim())) {
      fetch(`/api/articles/search-ean`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ean: val.trim() }) })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.id) router.push(`/${orgSlug}/articles/${data.id}`) })
        .catch(() => {})
      return
    }
    searchTimer.current = setTimeout(() => setSearch(val), 300)
  }

  function toggleSort(col: string) {
    if (sort === col) setOrder(o => o === "asc" ? "desc" : "asc")
    else { setSort(col); setOrder("asc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sort !== col) return <span className="text-muted-foreground ml-1">↕</span>
    return <span className="ml-1">{order === "asc" ? "↑" : "↓"}</span>
  }

  function toggleAll() {
    if (selected.size === articles.length) setSelected(new Set())
    else setSelected(new Set(articles.map(a => a.id)))
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function changeLimit(v: number) {
    setLimit(v)
    localStorage.setItem(LIMIT_KEY, String(v))
  }

  async function deactivateSelected() {
    await fetch("/api/articles/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleIds: [...selected], operation: "deactivate", parameters: {} }),
    })
    setSelected(new Set())
    fetchArticles()
  }

  async function deleteRow(id: string) {
    if (!confirm("Ta bort artikel? Åtgärden kan inte ångras.")) return
    await fetch(`/api/articles/${id}`, { method: "DELETE" })
    fetchArticles()
  }

  async function togglePhasing(id: string, current: boolean) {
    await fetch("/api/articles/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleIds: [id], operation: "set_is_phasing_out", parameters: { value: !current } }),
    })
    fetchArticles()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch("/api/articles/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleIds: [id], operation: current ? "deactivate" : "activate", parameters: {} }),
    })
    fetchArticles()
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Artikelregister</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} artiklar totalt</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/articles/import`}>
            <Button variant="outline" size="sm">Importera</Button>
          </Link>
          <Link href={`/${orgSlug}/articles/new`}>
            <Button size="sm">+ Ny artikel</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
            <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{tabs[t]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Sök namn, artikelnr, EAN…"
          defaultValue={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="flex-1 min-w-[200px] max-w-xs px-3 py-2 text-sm border border-input rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {manufacturers.length > 0 && (
          <select
            value={manufacturer}
            onChange={e => setManufacturer(e.target.value)}
            className="px-3 py-2 text-sm border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Alla tillverkare</option>
            {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <select
          value={String(limit)}
          onChange={e => changeLimit(parseInt(e.target.value))}
          className="px-3 py-2 text-sm border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="10">10 / sida</option>
          <option value="25">25 / sida</option>
          <option value="100">100 / sida</option>
          <option value="250">250 / sida</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetch("/api/articles/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "csv" }) })
              .then(r => r.blob())
              .then(blob => {
                const a = document.createElement("a")
                a.href = URL.createObjectURL(blob)
                a.download = `artiklar-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
              })
          }}
        >
          Exportera CSV
        </Button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-accent rounded-lg border border-input">
          <span className="text-sm text-foreground font-medium">{selected.size} valda</span>
          <Button variant="outline" size="sm" onClick={deactivateSelected}>Inaktivera</Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-muted-foreground hover:text-foreground">Avmarkera alla</button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : articles.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">Inga artiklar hittades.</p>
              <Link href={`/${orgSlug}/articles/new`}>
                <Button size="sm" className="mt-4">+ Skapa första artikeln</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border">
                      <th className="px-4 py-3 w-8">
                        <input type="checkbox" checked={selected.size === articles.length && articles.length > 0} onChange={toggleAll} className="rounded border-input" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer whitespace-nowrap" onClick={() => toggleSort("sku")}>Art nr<SortIcon col="sku" /></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => toggleSort("name")}>Namn<SortIcon col="name" /></th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer whitespace-nowrap" onClick={() => toggleSort("unitPrice")}>Utpris<SortIcon col="unitPrice" /></th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Inköp</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">TG %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer whitespace-nowrap" onClick={() => toggleSort("stockQuantity")}>Lager<SortIcon col="stockQuantity" /></th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Reserv.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Dispon.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer whitespace-nowrap" onClick={() => toggleSort("inventoryValue")}>Lagervärde<SortIcon col="inventoryValue" /></th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map(a => (
                      <tr key={a.id} className="border-t border/50 hover:bg-muted/50">
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleRow(a.id)} className="rounded border-input" />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground cursor-pointer" onClick={() => router.push(`/${orgSlug}/articles/${a.id}`)}>
                          {a.sku ?? "—"}
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/${orgSlug}/articles/${a.id}`)}>
                          <p className="font-medium text-foreground">{a.name}</p>
                          {a.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{a.description}</p>}
                          {a.manufacturer && <p className="text-xs text-muted-foreground">{a.manufacturer}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{fmtPrice(Number(a.unitPrice))}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{a.averageCost ? fmtPrice(Number(a.averageCost)) : "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <TGCell unitPrice={Number(a.unitPrice)} averageCost={Number(a.averageCost)} />
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">{a.isStockItem ? Number(a.stockQuantity).toLocaleString("sv-SE") : "—"}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{a.isStockItem ? Number(a.reservedQuantity).toLocaleString("sv-SE") : "—"}</td>
                        <td className="px-4 py-3 text-right text-foreground">{a.isStockItem ? Number(a.availableQuantity).toLocaleString("sv-SE") : "—"}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{a.isStockItem ? fmtPrice(Number(a.inventoryValue)) : "—"}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge article={a} /></td>
                        <td className="px-4 py-3 relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setRowMenu(rowMenu === a.id ? null : a.id)}
                            className="p-1 rounded hover:bg-accent text-muted-foreground"
                          >⋮</button>
                          {rowMenu === a.id && (
                            <div className="absolute right-0 top-8 z-10 w-48 bg-card border border-input rounded-lg shadow-lg py-1 text-sm">
                              <button onClick={() => { router.push(`/${orgSlug}/articles/${a.id}`); setRowMenu(null) }} className="w-full text-left px-4 py-2 hover:bg-muted text-foreground">Visa</button>
                              <button onClick={() => { router.push(`/${orgSlug}/articles/${a.id}/edit`); setRowMenu(null) }} className="w-full text-left px-4 py-2 hover:bg-muted text-foreground">Redigera</button>
                              <button onClick={() => { router.push(`/${orgSlug}/invoices/new?articleId=${a.id}`); setRowMenu(null) }} className="w-full text-left px-4 py-2 hover:bg-muted text-foreground">Skapa faktura</button>
                              <hr className="my-1 border-input" />
                              <button onClick={() => { togglePhasing(a.id, a.isPhasingOut); setRowMenu(null) }} className="w-full text-left px-4 py-2 hover:bg-muted text-muted-foreground">
                                {a.isPhasingOut ? "Ta bort utgående" : "Markera utgående"}
                              </button>
                              <button onClick={() => { toggleActive(a.id, a.isActive); setRowMenu(null) }} className="w-full text-left px-4 py-2 hover:bg-muted text-muted-foreground">
                                {a.isActive ? "Inaktivera" : "Aktivera"}
                              </button>
                              <hr className="my-1 border-input" />
                              <button onClick={() => { deleteRow(a.id); setRowMenu(null) }} className="w-full text-left px-4 py-2 hover:bg-muted text-destructive">Ta bort</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {articles.map(a => (
                  <div key={a.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/${orgSlug}/articles/${a.id}`)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{a.name}</p>
                        {a.sku && <p className="text-xs font-mono text-muted-foreground mt-0.5">{a.sku}</p>}
                      </div>
                      <StatusBadge article={a} />
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span className="text-foreground font-medium">{fmtPrice(Number(a.unitPrice))}</span>
                      {a.isStockItem && (
                        <span className="text-muted-foreground">Lager: {Number(a.stockQuantity).toLocaleString("sv-SE")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Sida {page} av {pages} ({total} artiklar)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-input rounded-lg disabled:opacity-40 hover:bg-muted"
            >
              ← Föregående
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
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
