"use client"

import { useState } from "react"
import type { SnapshotClient, Alert } from "./types"
import { HealthBar }  from "./HealthBar"

interface Props {
  client: SnapshotClient
  onRefresh: () => void
}

const SEVERITY_ICON: Record<Alert["severity"], string> = {
  error:   "●",
  warning: "▲",
  info:    "ℹ",
}

const SEVERITY_CLS: Record<Alert["severity"], string> = {
  error:   "text-red-600",
  warning: "text-yellow-600",
  info:    "text-blue-600",
}

export function HealthPanel({ client, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch(`/api/agency/clients/${client.clientId}`, { method: "POST" })
      onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="bg-muted border-t border px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      {/* Health breakdown */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hälsoscore</p>
        <div className="space-y-1.5">
          <HealthBar score={client.healthScore} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span>Försenade fakturor</span>
            <span className={`text-right font-medium ${client.overdueInvoiceCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              {client.overdueInvoiceCount}
            </span>
            <span>Obokade leverantörsfakt.</span>
            <span className={`text-right font-medium ${client.unbookedSupplierCount > 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
              {client.unbookedSupplierCount}
            </span>
            <span>AI-avvikelser</span>
            <span className={`text-right font-medium ${client.openAiAnomalyCount > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
              {client.openAiAnomalyCount}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Varningar</p>
        {client.alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Inga aktiva varningar</p>
        ) : (
          <ul className="space-y-1">
            {client.alerts.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <span className={`flex-shrink-0 mt-px ${SEVERITY_CLS[a.severity]}`}>{SEVERITY_ICON[a.severity]}</span>
                <span className="text-foreground">{a.message}{a.count && a.count > 1 ? ` (${a.count})` : ""}</span>
              </li>
            ))}
            {client.alerts.length > 5 && (
              <li className="text-xs text-muted-foreground">+{client.alerts.length - 5} till…</li>
            )}
          </ul>
        )}
      </div>

      {/* Deadlines */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Datum &amp; deadlines</p>
        <dl className="space-y-1 text-xs">
          {client.nextVatDeadlineAt && (
            <>
              <dt className="text-muted-foreground">Nästa momsdeklaration</dt>
              <dd className={`font-medium ${(client.vatDeadlineDaysLeft ?? 99) <= 30 ? "text-indigo-700" : "text-foreground"}`}>
                {new Date(client.nextVatDeadlineAt).toLocaleDateString("sv-SE")}
                {client.vatDeadlineDaysLeft !== null && (
                  <span className="text-muted-foreground font-normal ml-1">({client.vatDeadlineDaysLeft} dagar)</span>
                )}
              </dd>
            </>
          )}
          {client.fiscalYearEndsAt && (
            <>
              <dt className="text-muted-foreground mt-1.5">Räkenskapsår slutar</dt>
              <dd className={`font-medium ${(client.fiscalYearDaysLeft ?? 99) <= 60 ? "text-orange-700" : "text-foreground"}`}>
                {new Date(client.fiscalYearEndsAt).toLocaleDateString("sv-SE")}
                {client.fiscalYearDaysLeft !== null && (
                  <span className="text-muted-foreground font-normal ml-1">({client.fiscalYearDaysLeft} dagar)</span>
                )}
              </dd>
            </>
          )}
          {!client.nextVatDeadlineAt && !client.fiscalYearEndsAt && (
            <dd className="text-muted-foreground italic">Inga datum konfigurerade</dd>
          )}
        </dl>
      </div>

      {/* Actions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Åtgärder</p>
        <div className="space-y-2">
          <a
            href={`/${client.clientSlug}`}
            className="block w-full text-center text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Öppna klientvy
          </a>
          <a
            href={`/${client.clientSlug}/invoices`}
            className="block w-full text-center text-xs font-medium px-3 py-1.5 rounded-lg border border text-foreground hover:bg-muted transition-colors"
          >
            Fakturor
          </a>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="block w-full text-center text-xs font-medium px-3 py-1.5 rounded-lg border border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {refreshing ? "Uppdaterar…" : "Uppdatera snapshot"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Beräknad: {new Date(client.computedAt).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}
