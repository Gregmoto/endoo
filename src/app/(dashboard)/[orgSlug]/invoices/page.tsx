"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Contact = { id: string; name: string; customerNumber: string | null }
type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  issueDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  currency: string
  contact: Contact | null
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:         { label: "Utkast",    cls: "bg-gray-100 text-gray-500" },
  sent:          { label: "Skickad",   cls: "bg-blue-100 text-blue-700" },
  viewed:        { label: "Visad",     cls: "bg-indigo-100 text-indigo-700" },
  partial:       { label: "Delbetald",cls: "bg-yellow-100 text-yellow-700" },
  paid:          { label: "Betald",    cls: "bg-green-100 text-green-700" },
  overdue:       { label: "Förfallen", cls: "bg-red-100 text-red-700" },
  void:          { label: "Makulerad",cls: "bg-orange-100 text-orange-700" },
  uncollectable: { label: "Osäker",    cls: "bg-red-200 text-red-800" },
}

function fmtAmount(v: number, currency: string) {
  return `${(v / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE")
}

function isOverdue(inv: Invoice) {
  return ["sent", "viewed", "partial"].includes(inv.status) && new Date(inv.dueDate) < new Date()
}

export default function InvoicesPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [loading, setLoading]   = useState(true)

  const [search, setSearch]     = useState("")
  const [status, setStatus]     = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo]     = useState("")
  const [page, setPage]         = useState(1)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page) })
    if (search)   qs.set("search", search)
    if (status)   qs.set("status", status)
    if (dateFrom) qs.set("dateFrom", dateFrom)
    if (dateTo)   qs.set("dateTo", dateTo)
    const res = await fetch(`/api/invoices?${qs}`)
    if (res.ok) {
      const data = await res.json()
      setInvoices(data.invoices)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [page, search, status, dateFrom, dateTo])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { setPage(1) }, [search, status, dateFrom, dateTo])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fakturor</h1>
          <p className="text-sm text-gray-500 mt-1">{total} fakturor totalt</p>
        </div>
        <Link href={`/${orgSlug}/invoices/new`}>
          <Button size="sm">+ Ny faktura</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Sök fakturanr, kund, referens…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alla statusar</option>
          <option value="draft">Utkast</option>
          <option value="sent">Skickad</option>
          <option value="partial">Delbetald</option>
          <option value="paid">Betald</option>
          <option value="overdue">Förfallen</option>
          <option value="void">Makulerad</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Från datum"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Till datum"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Laddar…</div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">◧</p>
              <p className="font-medium text-gray-900">Inga fakturor hittades</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Skapa din första faktura</p>
              <Link href={`/${orgSlug}/invoices/new`}>
                <Button size="sm">+ Ny faktura</Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fakturanr</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kund</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Förfaller</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Belopp</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const overdue  = isOverdue(inv)
                  const display  = overdue ? STATUS_LABELS.overdue : (STATUS_LABELS[inv.status] ?? STATUS_LABELS.draft)
                  const balance  = inv.totalAmount - inv.paidAmount
                  return (
                    <tr
                      key={inv.id}
                      className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/invoices/${inv.id}`)}
                    >
                      <td className="px-5 py-3 font-medium font-mono">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3 text-gray-700">
                        {inv.contact?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(inv.issueDate)}</td>
                      <td className={`px-5 py-3 ${overdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                        {fmtDate(inv.dueDate)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <p className="font-medium text-gray-900">{fmtAmount(inv.totalAmount, inv.currency)}</p>
                        {balance > 0 && balance < inv.totalAmount && (
                          <p className="text-xs text-yellow-600">kvar: {fmtAmount(balance, inv.currency)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${display.cls}`}>{display.label}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/${orgSlug}/invoices/${inv.id}`}
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
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Sida {page} av {pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Föregående
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Nästa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
