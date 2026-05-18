"use client"

import { useState } from "react"
import type { SnapshotClient } from "./types"
import { HealthBar, healthLabel } from "./HealthBar"
import { HealthPanel }            from "./HealthPanel"

interface Props {
  client:      SnapshotClient
  selected:    boolean
  onSelect:    (id: string, on: boolean) => void
  pinned:      boolean
  onPin:       (id: string) => void
  onRefresh:   () => void
}

export function ClientRow({ client, selected, onSelect, pinned, onPin, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hl = healthLabel(client.healthScore)

  const hasError   = client.errorCount   > 0
  const hasWarning = client.warningCount > 0

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      expanded ? "border-brand-300 shadow-sm" : "border hover:border"
    } ${selected ? "bg-blue-50/40" : "bg-card"}`}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect(client.clientId, e.target.checked)}
          onClick={e => e.stopPropagation()}
          className="h-4 w-4 rounded border text-brand-600 flex-shrink-0"
        />

        {/* Pin */}
        <button
          onClick={e => { e.stopPropagation(); onPin(client.clientId) }}
          className={`flex-shrink-0 text-sm transition-colors ${pinned ? "text-brand-500" : "text-muted-foreground hover:text-muted-foreground"}`}
          title={pinned ? "Avnåla" : "Nåla"}
        >
          {pinned ? "★" : "☆"}
        </button>

        {/* Client name + slug */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">{client.clientName}</span>
            {hasError && (
              <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                ● {client.errorCount}
              </span>
            )}
            {!hasError && hasWarning && (
              <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                ▲ {client.warningCount}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{client.clientSlug}</p>
        </button>

        {/* Health score badge */}
        <div className="flex-shrink-0 hidden sm:flex flex-col items-end gap-1 w-28">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hl.cls}`}>{hl.label}</span>
          <HealthBar score={client.healthScore} showLabel size="sm" />
        </div>

        {/* VAT deadline */}
        <div className="flex-shrink-0 hidden md:block w-24 text-right">
          {client.vatDeadlineDaysLeft !== null ? (
            <span className={`text-xs font-medium ${client.vatDeadlineDaysLeft <= 30 ? "text-indigo-700" : "text-muted-foreground"}`}>
              Moms {client.vatDeadlineDaysLeft}d
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* AI pending */}
        {client.pendingAiSuggestionCount > 0 && (
          <div className="flex-shrink-0 hidden lg:block">
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              AI {client.pendingAiSuggestionCount}
            </span>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-shrink-0 text-muted-foreground hover:text-muted-foreground transition-colors"
        >
          <span className={`inline-block transition-transform text-xs ${expanded ? "rotate-180" : ""}`}>▼</span>
        </button>

        {/* Direct link */}
        <a
          href={`/${client.clientSlug}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"
        >
          →
        </a>
      </div>

      {/* Inline health panel */}
      {expanded && (
        <HealthPanel client={client} onRefresh={onRefresh} />
      )}
    </div>
  )
}
