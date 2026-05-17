"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter }              from "next/navigation"
import Link                                  from "next/link"

type SupplierInvoice = {
  id:            string
  status:        string
  supplierName:  string | null
  invoiceNumber: string | null
  invoiceDate:   string | null
  dueDate:       string | null
  amountInclVat: number | null
  currency:      string
  extractionStatus: string
  supplier?:     { id: string; name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  draft:        "Utkast",
  extracting:   "Analyseras…",
  needs_review: "Granska",
  approved:     "Godkänd",
  booked:       "Bokförd",
  paid:         "Betald",
  rejected:     "Avvisad",
}

const STATUS_COLOR: Record<string, string> = {
  draft:        "bg-gray-100 text-gray-600",
  extracting:   "bg-blue-100 text-blue-700",
  needs_review: "bg-yellow-100 text-yellow-700",
  approved:     "bg-indigo-100 text-indigo-700",
  booked:       "bg-green-100 text-green-700",
  paid:         "bg-emerald-100 text-emerald-700",
  rejected:     "bg-red-100 text-red-600",
}

function formatAmount(ore: number | null, currency = "SEK") {
  if (ore == null) return "—"
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency }).format(ore / 100)
}

export default function SupplierInvoicesPage() {
  const { orgSlug }  = useParams<{ orgSlug: string }>()
  const router       = useRouter()
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [status,   setStatus]   = useState("")
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs  = new URLSearchParams({ page: String(page) })
    if (status) qs.set("status", status)
    const res = await fetch(`/api/supplier-invoices?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setInvoices(d.invoices)
      setTotal(d.total)
      setPages(d.pages)
    }
    setLoading(false)
  }, [page, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [status])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leverantörsfakturor</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} fakturor totalt</p>
        </div>
        <Link
          href={`/${orgSlug}/supplier-invoices/upload`}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Ladda upp faktura
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {["", "needs_review", "approved", "booked", "paid"].map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              status === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "" ? "Alla" : STATUS_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Laddar…</div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">Inga fakturor hittades</p>
            <Link
              href={`/${orgSlug}/supplier-invoices/upload`}
              className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
            >
              Ladda upp din första faktura →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Leverantör", "Fakturanr", "Datum", "Förfaller", "Belopp", "Status", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr
                  key={inv.id}
                  className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/${orgSlug}/supplier-invoices/${inv.id}`)}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {inv.supplier?.name ?? inv.supplierName ?? <span className="text-gray-400 italic">Okänd</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                    {inv.invoiceNumber ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("sv-SE") : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {inv.dueDate
                      ? (() => {
                          const d    = new Date(inv.dueDate)
                          const late = d < new Date() && inv.status !== "paid"
                          return (
                            <span className={late ? "text-red-600 font-medium" : ""}>
                              {d.toLocaleDateString("sv-SE")}
                            </span>
                          )
                        })()
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-900 font-medium tabular-nums">
                    {formatAmount(inv.amountInclVat, inv.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLOR[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs text-indigo-600 hover:underline">Öppna →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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
