"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter }             from "next/navigation"
import Link                                 from "next/link"

type Journal = {
  id:          string
  reference:   string
  date:        string
  description: string
  status:      "draft" | "posted" | "voided"
  sourceType:  string | null
  postedAt:    string | null
  createdAt:   string
  fiscalYear:  { name: string }
  series:      { prefix: string; name: string }
  entries: {
    debit:   string
    credit:  string
    account: { number: string; name: string }
  }[]
}

const STATUS_LABEL: Record<string, string> = {
  draft:  "Utkast",
  posted: "Bokförd",
  voided: "Återförd",
}

const STATUS_COLOR: Record<string, string> = {
  draft:  "bg-yellow-100 text-yellow-700",
  posted: "bg-green-100 text-green-700",
  voided: "bg-gray-100 text-gray-500",
}

const SOURCE_LABEL: Record<string, string> = {
  invoice:          "Faktura",
  payment:          "Betalning",
  credit_note:      "Kreditnota",
  supplier_invoice: "Leverantörsfaktura",
  manual:           "Manuell",
}

function totalDebit(entries: Journal["entries"]) {
  return entries.reduce((s, e) => s + Number(e.debit), 0)
}

function fmt(ore: number) {
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(ore / 100) + " kr"
}

export default function JournalsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router      = useRouter()

  const [journals, setJournals] = useState<Journal[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState("")
  const [status,   setStatus]   = useState("")
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const pages = Math.ceil(total / 50)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set("search", search)
    if (status) params.set("status", status)
    const res = await fetch(`/api/journals?${params}`)
    if (res.ok) {
      const d = await res.json()
      setJournals(d.journals)
      setTotal(d.total)
    }
    setLoading(false)
  }, [page, search, status])

  useEffect(() => { load() }, [load])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, status])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bokföring</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} verifikat totalt</p>
        </div>
        <Link
          href={`/${orgSlug}/journals/new`}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nytt verifikat
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Sök referens eller text…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-60 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        >
          <option value="">Alla statusar</option>
          <option value="draft">Utkast</option>
          <option value="posted">Bokförda</option>
          <option value="voided">Återförda</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Laddar…</div>
        ) : journals.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-sm mb-2">
              {total === 0 ? "Inga verifikat ännu." : "Inga verifikat matchar sökningen."}
            </p>
            {total === 0 && (
              <p className="text-xs text-gray-400">
                Verifikat skapas automatiskt när du fakturerar eller godkänner en leverantörsfaktura. Du kan också skapa manuella verifikat.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["Referens", "Datum", "Beskrivning", "Typ", "Belopp", "Status", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {journals.map(j => (
                <tr
                  key={j.id}
                  onClick={() => router.push(`/${orgSlug}/journals/${j.id}`)}
                  className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-indigo-700">{j.reference}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(j.date).toLocaleDateString("sv-SE")}
                  </td>
                  <td className="px-5 py-3 text-gray-900 max-w-xs truncate">{j.description}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {SOURCE_LABEL[j.sourceType ?? ""] ?? "Manuell"}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-gray-900 font-medium">
                    {fmt(totalDebit(j.entries))}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLOR[j.status]}`}>
                      {STATUS_LABEL[j.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-indigo-600">Öppna →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            ← Föregående
          </button>
          <span className="text-sm text-gray-500">{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Nästa →
          </button>
        </div>
      )}
    </div>
  )
}
