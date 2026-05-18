"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type DeliveryItem = {
  id:               string
  recipientEmail:   string
  subject:          string | null
  status:           string
  providerMessageId: string | null
  openedAt:         string | null
  clickedAt:        string | null
  deliveredAt:      string | null
  bouncedAt:        string | null
  createdAt:        string
  events:           Array<{ type: string; timestamp: string }>
}

type DeliveryResponse = {
  items: DeliveryItem[]
  total: number
  page:  number
  pages: number
}

const STATUS_BADGE: Record<string, string> = {
  queued:    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  sent:      "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  delivered: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  opened:    "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400",
  clicked:   "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400",
  bounced:   "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  complained:"bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400",
  delayed:   "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
}

const STATUS_LABEL: Record<string, string> = {
  queued:    "I kö",
  sent:      "Skickat",
  delivered: "Levererat",
  opened:    "Öppnat",
  clicked:   "Klickat",
  bounced:   "Returnerat",
  complained:"Klagomål",
  delayed:   "Fördröjt",
}

export default function EmailLogsPage() {
  const params = useParams<{ orgSlug: string }>()
  const [data,       setData]       = useState<DeliveryResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [statusFilter, setStatus]   = useState("")
  const [emailFilter,  setEmail]    = useState("")
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "50" })
    if (statusFilter) params.set("status", statusFilter)
    if (emailFilter)  params.set("email",  emailFilter)
    const res = await fetch(`/api/audit/email-logs?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [page, statusFilter, emailFilter])

  useEffect(() => { load() }, [load])

  function fmt(d: string | null) {
    if (!d) return "—"
    return new Date(d).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">E-postlogg</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Historik över alla skickade e-postmeddelanden
          </p>
        </div>
        <Link
          href={`/${params.orgSlug}/settings/email`}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          ← E-postinställningar
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="email"
          placeholder="Filtrera på e-post…"
          value={emailFilter}
          onChange={e => { setEmail(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-60"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Alla statusar</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {data && (
          <span className="ml-auto self-center text-sm text-gray-400 dark:text-gray-500">
            {data.total} utskick
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">Laddar…</div>
      ) : !data?.items.length ? (
        <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">Inga utskick hittades</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tid</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Mottagare</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Ämne</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Öppnat</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Detaljer</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => (
                <>
                  <tr
                    key={item.id}
                    className="border-t border-gray-50 dark:border-gray-800 hover:bg-muted dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  >
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmt(item.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-gray-900 dark:text-gray-100 text-xs">
                      {item.recipientEmail}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs truncate max-w-[200px]">
                      {item.subject ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_BADGE[item.status] ?? STATUS_BADGE.queued}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.openedAt ? fmt(item.openedAt) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-indigo-600 dark:text-indigo-400">
                      {expanded === item.id ? "▲" : "▼"}
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr key={`${item.id}-expanded`} className="bg-gray-50 dark:bg-gray-800/30">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="space-y-3">
                          {item.providerMessageId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              ID: {item.providerMessageId}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs">
                            {item.deliveredAt && (
                              <span className="text-green-600 dark:text-green-400">✓ Levererat {fmt(item.deliveredAt)}</span>
                            )}
                            {item.openedAt && (
                              <span className="text-teal-600 dark:text-teal-400">👁 Öppnat {fmt(item.openedAt)}</span>
                            )}
                            {item.clickedAt && (
                              <span className="text-indigo-600 dark:text-indigo-400">🔗 Klickat {fmt(item.clickedAt)}</span>
                            )}
                            {item.bouncedAt && (
                              <span className="text-red-600 dark:text-red-400">✗ Returnerat {fmt(item.bouncedAt)}</span>
                            )}
                          </div>
                          {item.events.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Händelselogg</p>
                              <div className="space-y-1">
                                {item.events.map((ev, i) => (
                                  <div key={i} className="flex items-center gap-3 text-xs">
                                    <span className="text-gray-400 dark:text-gray-500 tabular-nums w-36 shrink-0">
                                      {fmt(ev.timestamp)}
                                    </span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{ev.type}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-muted dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            ← Föregående
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Sida {data.page} av {data.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-muted dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            Nästa →
          </button>
        </div>
      )}
    </div>
  )
}
