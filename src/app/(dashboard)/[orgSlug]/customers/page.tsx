"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { COUNTRIES } from "@/lib/data/countries"

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id:               string
  customerNumber:   string | null
  name:             string
  city:             string | null
  country:          string
  phone:            string | null
  email:            string | null
  status:           string
  type:             string
  _count:           { invoices: number }
  latestInvoiceDate?: string | null
  openInvoiceCount?:  number
  openInvoiceAmount?: number
  openInvoiceCurrency?: string
}

type Pagination = { page: number; size: number; total: number; pages: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countryFlag(code: string) {
  if (!code || code.length !== 2) return ""
  const points = [...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)
  return String.fromCodePoint(...points)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

function fmtAmount(v: number, currency: string) {
  return (v / 100).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " " + currency
}

const PAGE_SIZES = [10, 25, 100, 250]

const STATUS_OPTIONS = [
  { value: "",         label: "Alla statusar" },
  { value: "active",   label: "Aktiv" },
  { value: "inactive", label: "Inaktiv" },
  { value: "blocked",  label: "Blockerad" },
  { value: "ended",    label: "Avslutad" },
  { value: "test",     label: "Test" },
]

const SORT_COLS = [
  { key: "name",           label: "Namn" },
  { key: "customerNumber", label: "Kundnr" },
  { key: "city",           label: "Ort" },
  { key: "country",        label: "Land" },
  { key: "status",         label: "Status" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const params     = useParams<{ orgSlug: string }>()
  const router     = useRouter()
  const searchParams = useSearchParams()
  const { orgSlug } = params

  const [customers, setCustomers]     = useState<Customer[]>([])
  const [pagination, setPagination]   = useState<Pagination>({ page: 1, size: 25, total: 0, pages: 1 })
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showMore, setShowMore]       = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [bulkManagerId, setBulkManagerId] = useState("")

  const [search, setSearch]       = useState(searchParams.get("q") ?? "")
  const [country, setCountry]     = useState(searchParams.get("country") ?? "")
  const [status, setStatus]       = useState(searchParams.get("status") ?? "")
  const [sort, setSort]           = useState(searchParams.get("sort") ?? "name:asc")
  const [page, setPage]           = useState(Number(searchParams.get("page") ?? 1))
  const [size, setSize]           = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("customers_page_size") ?? 25)
    }
    return 25
  })
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [search])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({
      page:   String(page),
      size:   String(size),
      sort,
    })
    if (debouncedSearch) qs.set("q", debouncedSearch)
    if (country)         qs.set("country", country)
    if (status)          qs.set("status", status)

    const res = await fetch(`/api/contacts?search=${debouncedSearch}&${qs.toString()}`)
    if (res.ok) {
      const json = await res.json()
      setCustomers(json.contacts ?? [])
      setPagination({
        page:  json.page  ?? 1,
        size,
        total: json.total ?? 0,
        pages: json.pages ?? 1,
      })
    }
    setLoading(false)
    setSelected(new Set())
  }, [page, size, sort, debouncedSearch, country, status])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])
  useEffect(() => { setPage(1) }, [debouncedSearch, country, status, size])

  function handleSizeChange(n: number) {
    setSize(n)
    if (typeof window !== "undefined") localStorage.setItem("customers_page_size", String(n))
  }

  function toggleSort(col: string) {
    const [field, dir] = sort.split(":")
    if (field === col) {
      setSort(`${col}:${dir === "asc" ? "desc" : "asc"}`)
    } else {
      setSort(`${col}:asc`)
    }
    setPage(1)
  }

  function sortIndicator(col: string) {
    const [field, dir] = sort.split(":")
    if (field !== col) return null
    return dir === "asc" ? " ↑" : " ↓"
  }

  function toggleAll() {
    if (selected.size === customers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(customers.map(c => c.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function doBulkArchive(archive: boolean) {
    if (selected.size === 0) return
    setBulkLoading(true)
    await fetch("/api/contacts/bulk", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: archive ? "archive" : "activate", ids: Array.from(selected) }),
    })
    setBulkLoading(false)
    fetchCustomers()
  }

  async function doExportCsv() {
    setExportLoading(true)
    const res = await fetch("/api/contacts/export?format=csv", { method: "GET" })
    setExportLoading(false)
    if (res.ok) {
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `kunder-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const countryOptions = [
    { value: "", label: "Alla länder" },
    ...COUNTRIES.map(c => ({ value: c.code, label: c.name })),
  ]

  const selectCls = "px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-wide">KUNDER</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">{pagination.total} kunder totalt</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${orgSlug}/customers/import`)}
          >
            Import
          </Button>
          <Link href={`/${orgSlug}/customers/new`}>
            <Button size="sm">+ Ny kund</Button>
          </Link>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowMore(v => !v)}>⋮ Mer</Button>
            {showMore && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-card shadow-lg z-20 py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                  onClick={() => { doExportCsv(); setShowMore(false) }}
                  disabled={exportLoading}
                >
                  Exportera som CSV
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                  onClick={() => { router.push(`/${orgSlug}/customers/import`); setShowMore(false) }}
                >
                  Importera
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Sök namn, kundnr, e-post…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-xs px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select value={country} onChange={e => { setCountry(e.target.value); setPage(1) }} className={selectCls}>
          {countryOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className={selectCls}>
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {(search || country || status) && (
          <button
            onClick={() => { setSearch(""); setCountry(""); setStatus("") }}
            className="text-sm text-muted-foreground hover:text-foreground px-2"
          >
            Rensa ×
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 flex-wrap px-4 py-3 rounded-lg bg-muted border">
          <span className="text-sm text-foreground font-medium">{selected.size} valda</span>
          <Button size="sm" variant="outline" onClick={() => doBulkArchive(true)} loading={bulkLoading}>Arkivera</Button>
          <Button size="sm" variant="outline" onClick={() => doBulkArchive(false)} loading={bulkLoading}>Aktivera</Button>
          <input
            type="text"
            placeholder="Kundansvarig ID…"
            value={bulkManagerId}
            onChange={e => setBulkManagerId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-input rounded-lg bg-background text-foreground"
          />
          <Button size="sm" variant="outline" onClick={doExportCsv} loading={exportLoading} disabled={exportLoading}>Exportera CSV</Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-muted-foreground hover:text-foreground">Avmarkera</button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={customers.length > 0 && selected.size === customers.length}
                  onChange={toggleAll}
                  className="accent-primary"
                />
              </th>
              {SORT_COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-3 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                >
                  {col.label}{sortIndicator(col.key)}
                </th>
              ))}
              <th className="px-3 py-3 font-medium text-muted-foreground">Telefon</th>
              <th className="px-3 py-3 font-medium text-muted-foreground">E-post</th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Senaste faktura</th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Öppna fakt.</th>
              <th className="px-3 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="px-6 py-10 text-center text-sm text-muted-foreground">Laddar…</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-10 text-center text-sm text-muted-foreground">Inga kunder hittades</td>
              </tr>
            ) : (
              customers.map(c => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  orgSlug={orgSlug}
                  selected={selected.has(c.id)}
                  onToggle={() => toggleOne(c.id)}
                  onRefresh={fetchCustomers}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Laddar…</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Inga kunder hittades</p>
        ) : (
          customers.map(c => (
            <Link
              key={c.id}
              href={`/${orgSlug}/customers/${c.id}`}
              className="block rounded-xl border bg-card p-4 space-y-1 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{c.name}</span>
                <StatusBadge status={c.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                {c.customerNumber && <span className="mr-2">{c.customerNumber}</span>}
                {c.city && <span>{c.city}{c.country ? `, ${c.country}` : ""}</span>}
              </div>
              {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
              {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rader per sida:</span>
          {PAGE_SIZES.map(s => (
            <button
              key={s}
              onClick={() => handleSizeChange(s)}
              className={`px-2 py-1 text-xs rounded ${size === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {pagination.total === 0 ? "0" : `${(page - 1) * size + 1}–${Math.min(page * size, pagination.total)}`} av {pagination.total}
          </span>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 rounded border border-input hover:bg-muted disabled:opacity-40"
          >
            ‹
          </button>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 rounded border border-input hover:bg-muted disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function CustomerRow({
  customer: c,
  orgSlug,
  selected,
  onToggle,
  onRefresh,
}: {
  customer:  Customer
  orgSlug:   string
  selected:  boolean
  onToggle:  () => void
  onRefresh: () => void
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  async function handleArchive() {
    await fetch(`/api/contacts/${c.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: c.status === "inactive" ? "active" : "inactive" }),
    })
    onRefresh()
    setMenuOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Ta bort ${c.name}? Åtgärden kan inte ångras.`)) return
    await fetch(`/api/contacts/${c.id}`, { method: "DELETE" })
    onRefresh()
    setMenuOpen(false)
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-3 py-3">
        <input type="checkbox" checked={selected} onChange={onToggle} className="accent-primary" />
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{c.customerNumber ?? "—"}</td>
      <td className="px-3 py-3">
        <Link href={`/${orgSlug}/customers/${c.id}`} className="font-medium text-foreground hover:text-primary">
          {c.name}
        </Link>
      </td>
      <td className="px-3 py-3 text-muted-foreground">{c.city ?? "—"}</td>
      <td className="px-3 py-3 text-muted-foreground">
        {c.country ? `${countryFlag(c.country)} ${c.country}` : "—"}
      </td>
      <td className="px-3 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
      <td className="px-3 py-3">
        {c.email
          ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
          : <span className="text-muted-foreground">—</span>
        }
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={c.status} />
      </td>
      <td className="px-3 py-3 text-muted-foreground text-xs">{fmtDate(c.latestInvoiceDate)}</td>
      <td className="px-3 py-3">
        {c.openInvoiceCount ? (
          <span
            title={c.openInvoiceAmount ? fmtAmount(c.openInvoiceAmount, c.openInvoiceCurrency ?? "SEK") : undefined}
            className="text-xs text-foreground cursor-help"
          >
            {c.openInvoiceCount} st
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-3 relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          ⋮
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-card shadow-lg z-20 py-1">
            <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted" onClick={() => router.push(`/${orgSlug}/customers/${c.id}`)}>
              Visa
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted" onClick={() => router.push(`/${orgSlug}/customers/${c.id}/edit`)}>
              Redigera
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted" onClick={() => router.push(`/${orgSlug}/invoices/new?contactId=${c.id}`)}>
              Skapa faktura
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted" onClick={() => router.push(`/${orgSlug}/quotes/new?contactId=${c.id}`)}>
              Skapa offert
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted" onClick={() => router.push(`/${orgSlug}/customers/${c.id}?tab=transactions`)}>
              Visa transaktioner
            </button>
            <div className="my-1 border-t" />
            <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted" onClick={handleArchive}>
              {c.status === "inactive" ? "Aktivera" : "Arkivera"}
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted" onClick={handleDelete}>
              Ta bort
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
