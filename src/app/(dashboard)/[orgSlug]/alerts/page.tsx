"use client"

import { useState, useEffect } from "react"
import type { SnapshotClient, Alert } from "@/components/agency/types"
import { healthLabel } from "@/components/agency/HealthBar"

type AlertRow = Alert & { clientId: string; clientName: string; clientSlug: string; healthScore: number }

const SEVERITY_ORDER: Record<Alert["severity"], number> = { error: 0, warning: 1, info: 2 }

const SEVERITY_CLS: Record<Alert["severity"], string> = {
  error:   "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info:    "bg-blue-100 text-blue-700",
}

const SEVERITY_LABEL: Record<Alert["severity"], string> = {
  error:   "Kritisk",
  warning: "Varning",
  info:    "Info",
}

export default function AlertsPage() {
  const [rows,    setRows]    = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Alert["severity"] | "all">("all")

  useEffect(() => {
    fetch("/api/agency/clients")
      .then(r => r.ok ? r.json() : { clients: [] })
      .then(({ clients }: { clients: SnapshotClient[] }) => {
        const all: AlertRow[] = []
        for (const c of clients) {
          for (const a of c.alerts) {
            all.push({ ...a, clientId: c.clientId, clientName: c.clientName, clientSlug: c.clientSlug, healthScore: c.healthScore })
          }
        }
        all.sort((a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          a.clientName.localeCompare(b.clientName, "sv")
        )
        setRows(all)
        setLoading(false)
      })
  }, [])

  const filtered = filter === "all" ? rows : rows.filter(r => r.severity === filter)

  const errorCount   = rows.filter(r => r.severity === "error").length
  const warningCount = rows.filter(r => r.severity === "warning").length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Varningar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aktiva varningar över alla klienter</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Kritiska", count: errorCount,   cls: "text-red-700 bg-red-50",      key: "error"   as const },
          { label: "Varningar", count: warningCount, cls: "text-yellow-700 bg-yellow-50", key: "warning" as const },
          { label: "Totalt",    count: rows.length,  cls: "text-gray-700 bg-white",       key: "all"     as const },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`${s.cls} rounded-xl px-4 py-3 text-left border transition-all ${
              filter === s.key ? "border-brand-400 ring-1 ring-brand-400" : "border-gray-100 hover:border-gray-200"
            }`}
          >
            <p className="text-2xl font-bold tabular-nums">{s.count}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">✓</p>
          <p className="font-semibold text-foreground">Inga aktiva varningar</p>
          <p className="text-sm text-muted-foreground mt-1">Alla klienter är inom normala parametrar</p>
        </div>
      ) : (
        <div className="bg-card border border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Allvarlighet</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Klient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meddelande</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hälsa</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const hl = healthLabel(row.healthScore)
                return (
                  <tr key={i} className="border-t border-border/50 hover:bg-muted">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_CLS[row.severity]}`}>
                        {SEVERITY_LABEL[row.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{row.clientName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.message}{row.count && row.count > 1 ? ` (${row.count})` : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hl.cls}`}>{hl.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/${row.clientSlug}`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Öppna →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
