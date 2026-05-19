"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Contact = { id: string; name: string; customerNumber: string | null }
type Invoice = {
  id:            string
  invoiceNumber: string
  type:          string
  status:        string
  issueDate:     string
  dueDate:       string | null
  paidAt:        string | null
  totalAmount:   number
  paidAmount:    number
  currency:      string
  contact:       Contact | null
  billingName:   string | null
}
type Counts = { all: number; unbooked: number; unpaid: number; paid: number; void: number }
type Pagination = { page: number; size: number; total: number; totalPages: number }

const TABS = [
  { key: "all",      label: "Alla" },
  { key: "unbooked", label: "Ej bokförda" },
  { key: "unpaid",   label: "Obetalda" },
  { key: "paid",     label: "Betalda" },
  { key: "void",     label: "Makulerade" },
] as const

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:         { label: "Utkast",    cls: "bg-muted text-muted-foreground" },
  sent:          { label: "Skickad",   cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  viewed:        { label: "Visad",     cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  partial:       { label: "Delbetald",cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  paid:          { label: "Betald",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  overdue:       { label: "Förfallen", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  void:          { label: "Makulerad",cls: "bg-muted text-muted-foreground" },
  uncollectable: { label: "Osäker",    cls: "bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
}

const TYPE_LABELS: Record<string, string> = {
  invoice:     "Faktura",
  proforma:    "Proforma",
  credit_note: "Kreditnota",
  recurring:   "Avtal",
  cash:        "Kontant",
  interest:    "Ränta",
}

const SORT_COLS = [
  { key: "invoiceNumber", label: "Fakturanr" },
  { key: "type",          label: "Typ" },
  { key: "billingName",   label: "Kund" },
  { key: "issueDate",     label: "Fakturadatum" },
  { key: "totalAmount",   label: "Totalt" },
  { key: "currency",      label: "Valuta" },
  { key: "dueDate",       label: "Förfaller" },
  { key: "paidAmount",    label: "Betalt" },
  { key: "status",        label: "Status" },
]

function fmtAmount(v: number, currency: string) {
  return (v / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

function isOverdue(inv: Invoice) {
  if (!inv.dueDate) return false
  return ["sent", "viewed", "partial"].includes(inv.status) && new Date(inv.dueDate) < new Date()
}

function effectiveStatus(inv: Invoice) {
  return isOverdue(inv) ? "overdue" : inv.status
}

export default function InvoicesPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const { orgSlug } = params

  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [counts, setCounts]       = useState<Counts>({ all: 0, unbooked: 0, unpaid: 0, paid: 0, void: 0 })
  const [pagination, setPagination] = useState<Pagination>({ page: 1, size: 25, total: 0, totalPages: 1 })
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const [tab, setTab]         = useState<string>("all")
  const [search, setSearch]   = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo]   = useState("")
  const [sort, setSort]       = useState("issueDate:desc")
  const [page, setPage]       = useState(1)
  const [size, setSize]       = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("inv_page_size") ?? 25)
    }
    return 25
  })

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({
      tab,
      page: String(page),
      size: String(size),
      sort,
    })
    if (debouncedSearch) qs.set("q", debouncedSearch)
    if (dateFrom)        qs.set("from", dateFrom)
    if (dateTo)          qs.set("to", dateTo)
    const res = await fetch(`/api/invoices?${qs}`)
    if (res.ok) {
      const json = await res.json()
      setInvoices(json.data ?? [])
      setCounts(json.counts ?? { all: 0, unbooked: 0, unpaid: 0, paid: 0, void: 0 })
      setPagination(json.pagination ?? { page: 1, size, total: 0, totalPages: 1 })
    }
    setLoading(false)
    setSelected(new Set())
  }, [tab, page, size, sort, debouncedSearch, dateFrom, dateTo])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { setPage(1) }, [tab, debouncedSearch, dateFrom, dateTo, size])

  function handleSizeChange(newSize: number) {
    setSize(newSize)
    localStorage.setItem("inv_page_size", String(newSize))
  }

  function toggleSort(col: string) {
    const [field, dir] = sort.split(":")
    if (field === col) {
      setSort(`${col}:${dir === "asc" ? "desc" : "asc"}`)
    } else {
      setSort(`${col}:desc`)
    }
    setPage(1)
  }

  function sortIndicator(col: string) {
    const [field, dir] = sort.split(":")
    if (field !== col) return null
    return dir === "asc" ? " ↑" : " ↓"
  }

  function toggleAll() {
    if (selected.size === invoices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(invoices.map(i => i.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function doBulkAction(action: "send" | "delete" | "create_interest_invoices") {
    if (selected.size === 0) return
    setBulkLoading(true)
    const res = await fetch("/api/invoices/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: Array.from(selected) }),
    })
    setBulkLoading(false)
    if (res.ok) {
      const json = await res.json()
      alert(`Klart — ${json.affected} fakturor påverkades.`)
      fetchInvoices()
    } else {
      const json = await res.json().catch(() => ({ error: "Okänt fel" }))
      alert(`Fel: ${json.error}`)
    }
  }

  async function doExport(format: "csv" | "xlsx") {
    setExportLoading(true)
    const res = await fetch("/api/invoices/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        filters: { tab, q: debouncedSearch, from: dateFrom, to: dateTo },
        sort,
      }),
    })
    setExportLoading(false)
    if (res.ok) {
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `fakturor-${new Date().toISOString().slice(0, 10)}.${format === "xlsx" ? "csv" : "csv"}`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const countFor = (key: string) => counts[key as keyof Counts] ?? 0

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Fakturor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pagination.total} fakturor totalt</p>
        </div>
        <Link href={`/${orgSlug}/invoices/new`}>
          <Button className="min-h-[44px] px-4">+ Ny faktura</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border mb-4 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1) }}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {countFor(t.key) > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {countFor(t.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-col sm:flex-row flex-wrap gap-2">
        <input
          type="search"
          placeholder="Sök fakturanr, kund, e-post…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-0 sm:max-w-xs px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="Från datum"
          className="flex-1 sm:flex-none sm:w-36 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="Till datum"
          className="flex-1 sm:flex-none sm:w-36 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(search || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setDateFrom(""); setDateTo("") }}
            className="text-sm text-muted-foreground hover:text-foreground px-2"
          >
            Rensa ×
          </button>
        )}
        <div className="sm:ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              disabled={exportLoading}
              onClick={() => doExport("csv")}
              className="px-3 py-2 text-sm border border-input rounded-lg hover:bg-muted text-foreground disabled:opacity-50"
            >
              {exportLoading ? "…" : "Exportera CSV"}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-3 py-2 bg-accent rounded-lg border border-input">
          <span className="text-sm font-medium text-foreground">{selected.size} valda</span>
          <button
            onClick={() => doBulkAction("send")}
            disabled={bulkLoading}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            Skicka
          </button>
          <button
            onClick={() => doBulkAction("create_interest_invoices")}
            disabled={bulkLoading}
            className="px-3 py-1.5 text-sm border border-input rounded hover:bg-muted text-foreground disabled:opacity-50"
          >
            Räntefakturor
          </button>
          <button
            onClick={() => {
              if (confirm(`Ta bort ${selected.size} faktura(or)? Enbart utkast tas bort.`)) doBulkAction("delete")
            }}
            disabled={bulkLoading}
            className="px-3 py-1.5 text-sm text-destructive border border-destructive/30 rounded hover:bg-destructive/10 disabled:opacity-50"
          >
            Ta bort
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-muted-foreground hover:text-foreground">
            Avmarkera
          </button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center px-4">
              <p className="font-medium text-foreground mb-1">Inga fakturor hittades</p>
              <p className="text-sm text-muted-foreground mb-4">
                {tab === "all" ? "Skapa din första faktura" : "Inga fakturor matchar detta filter"}
              </p>
              {tab === "all" && (
                <Link href={`/${orgSlug}/invoices/new`}>
                  <Button className="min-h-[44px]">+ Ny faktura</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.size === invoices.length && invoices.length > 0}
                          onChange={toggleAll}
                          className="rounded border-input"
                        />
                      </th>
                      {SORT_COLS.map(col => (
                        <th
                          key={col.key}
                          className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                          onClick={() => toggleSort(col.key)}
                        >
                          {col.label}{sortIndicator(col.key)}
                        </th>
                      ))}
                      <th className="px-3 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => {
                      const eff     = effectiveStatus(inv)
                      const display = STATUS_LABELS[eff] ?? STATUS_LABELS.draft
                      const balance = inv.totalAmount - inv.paidAmount
                      const overdue = eff === "overdue"
                      return (
                        <tr
                          key={inv.id}
                          className={`border-t border-border/50 hover:bg-muted/40 cursor-pointer ${selected.has(inv.id) ? "bg-accent/30" : ""}`}
                          onClick={() => router.push(`/${orgSlug}/invoices/${inv.id}`)}
                        >
                          <td className="w-10 px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleOne(inv.id) }}>
                            <input
                              type="checkbox"
                              checked={selected.has(inv.id)}
                              onChange={() => toggleOne(inv.id)}
                              className="rounded border-input"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono font-medium text-foreground whitespace-nowrap">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {TYPE_LABELS[inv.type] ?? inv.type}
                          </td>
                          <td className="px-3 py-2.5 text-foreground max-w-[180px] truncate">
                            {inv.contact?.name ?? inv.billingName ?? <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {fmtDate(inv.issueDate)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                            <span className="font-medium text-foreground">{fmtAmount(inv.totalAmount, inv.currency)}</span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {inv.currency}
                          </td>
                          <td className={`px-3 py-2.5 whitespace-nowrap ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {fmtDate(inv.dueDate)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                            {balance > 0 && balance < inv.totalAmount ? (
                              <span className="text-amber-600 dark:text-amber-400">{fmtAmount(balance, inv.currency)}</span>
                            ) : inv.paidAmount > 0 ? (
                              fmtAmount(inv.paidAmount, inv.currency)
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${display.cls}`}>
                              {display.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                            <InvoiceRowMenu orgSlug={orgSlug} inv={inv} onRefresh={fetchInvoices} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {invoices.map(inv => {
                  const eff     = effectiveStatus(inv)
                  const display = STATUS_LABELS[eff] ?? STATUS_LABELS.draft
                  const balance = inv.totalAmount - inv.paidAmount
                  return (
                    <button
                      key={inv.id}
                      className="w-full text-left px-4 py-3.5 hover:bg-muted/40 active:bg-muted transition-colors"
                      onClick={() => router.push(`/${orgSlug}/invoices/${inv.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium leading-none ${display.cls}`}>
                              {display.label}
                            </span>
                          </div>
                          <p className="font-medium text-foreground text-sm truncate">
                            {inv.contact?.name ?? inv.billingName ?? "Ingen kund"}
                          </p>
                          <p className={`text-xs mt-0.5 ${eff === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                            {eff === "overdue" ? "Förfallen " : "Förfaller "}{fmtDate(inv.dueDate)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-foreground tabular-nums text-sm">
                            {fmtAmount(inv.totalAmount, inv.currency)}
                          </p>
                          {balance > 0 && balance < inv.totalAmount && (
                            <p className="text-xs text-amber-600 tabular-nums">kvar: {fmtAmount(balance, inv.currency)}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Footer — page size + pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="text-xs">Visa</span>
          {[10, 25, 100, 250].map(n => (
            <button
              key={n}
              onClick={() => handleSizeChange(n)}
              className={`px-2.5 py-1 text-xs border rounded ${size === n ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted text-foreground"}`}
            >
              {n}
            </button>
          ))}
          <span className="text-xs">per sida</span>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs">Sida {pagination.page} av {pagination.totalPages}</span>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-input rounded-lg disabled:opacity-40 hover:bg-muted min-h-[40px]"
            >
              ←
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-2 border border-input rounded-lg disabled:opacity-40 hover:bg-muted min-h-[40px]"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function InvoiceRowMenu({
  orgSlug,
  inv,
  onRefresh,
}: {
  orgSlug: string
  inv: Invoice
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function createInterest() {
    setOpen(false)
    const res = await fetch(`/api/invoices/${inv.id}/create-interest-invoice`, { method: "POST" })
    if (res.ok) {
      const json = await res.json()
      alert(`Räntefaktura ${json.invoiceNumber} skapad som utkast.`)
      onRefresh()
    } else {
      const json = await res.json().catch(() => ({ error: "Fel" }))
      alert(`Fel: ${json.error}`)
    }
  }

  const overdue = isOverdue(inv)
  const canInterest = overdue && ["sent", "viewed", "partial", "overdue"].includes(inv.status)

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Åtgärder"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border rounded-lg shadow-lg z-10 py-1">
          <Link
            href={`/${orgSlug}/invoices/${inv.id}`}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            Visa
          </Link>
          {inv.status === "draft" && (
            <Link
              href={`/${orgSlug}/invoices/${inv.id}/edit`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              Redigera
            </Link>
          )}
          <a
            href={`/api/invoices/${inv.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            PDF
          </a>
          {canInterest && (
            <button
              onClick={createInterest}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              Räntefaktura
            </button>
          )}
        </div>
      )}
    </div>
  )
}
