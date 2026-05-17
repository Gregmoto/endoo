"use client"

import { useState } from "react"

interface JournalLine {
  accountNumber: string
  accountName:   string
  debit:         number
  credit:        number
  vatCode:       string | null
  description:   string | null
}

interface SuggestionReviewProps {
  suggestionId:        string
  entries:             JournalLine[]
  confidence:          number
  confidenceBreakdown: Record<string, number>
  warnings:            string[]
  explanation:         string
  onAccept:            (entries: JournalLine[]) => void
  onReject:            (reason: string) => void
}

function fmtOre(ore: number) {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  if (score >= 0.85) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{pct}% — Hög träffsäkerhet</span>
  }
  if (score >= 0.60) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">{pct}% — Granska noggrant</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{pct}% — Manuell granskning</span>
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? "bg-green-400" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-40 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  )
}

const BREAKDOWN_LABELS: Record<string, string> = {
  vendorKnown:         "Leverantör känd",
  accountHistoryMatch: "Kontomatchning",
  descriptionMatch:    "Beskrivningsmatch",
  vatRateConsistency:  "Momskonsistens",
  amountReasonable:    "Belopp rimligt",
  modelConfidence:     "AI-konfidenspoäng",
}

export function SuggestionReview({
  suggestionId,
  entries,
  confidence,
  confidenceBreakdown,
  warnings,
  explanation,
  onAccept,
  onReject,
}: SuggestionReviewProps) {
  const [editedEntries, setEditedEntries] = useState<JournalLine[]>(entries)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [rejecting, setRejecting]         = useState(false)
  const [rejectReason, setRejectReason]   = useState("")
  const [submitting, setSubmitting]       = useState(false)

  function updateEntry(idx: number, field: keyof JournalLine, value: string | number | null) {
    setEditedEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const isModified = JSON.stringify(editedEntries) !== JSON.stringify(entries)

  async function handleAccept() {
    setSubmitting(true)
    const action = isModified ? "modified" : "accepted"
    const modifiedFields = isModified
      ? { entries: editedEntries }
      : undefined

    await fetch(`/api/ai/suggestions/${suggestionId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, modifiedFields }),
    })
    onAccept(editedEntries)
    setSubmitting(false)
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setSubmitting(true)
    await fetch(`/api/ai/suggestions/${suggestionId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "rejected", rejectionReason: rejectReason }),
    })
    onReject(rejectReason)
    setSubmitting(false)
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-indigo-600">✦</span>
          <span className="font-semibold text-gray-900 text-sm">AI-konteringsförslag</span>
        </div>
        <ConfidenceBadge score={confidence} />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-700">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Explanation */}
      <div className="px-4 py-2.5 text-xs text-gray-600 bg-gray-50 border-b border-gray-100">
        {explanation}
      </div>

      {/* Journal entries — editable */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Konto</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Beskrivning</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Momskod</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Debet</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {editedEntries.map((entry, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-gray-500">{entry.accountNumber}</span>
                    <span className="text-xs text-gray-700">{entry.accountName}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <input
                    value={entry.description ?? ""}
                    onChange={e => updateEntry(i, "description", e.target.value || null)}
                    className="text-xs border-0 bg-transparent focus:ring-0 text-gray-600 w-full"
                    placeholder="—"
                  />
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{entry.vatCode ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-900 text-xs">
                  {entry.debit > 0 ? fmtOre(entry.debit) : ""}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-900 text-xs">
                  {entry.credit > 0 ? fmtOre(entry.credit) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confidence breakdown (collapsible) */}
      <div className="px-4 py-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowBreakdown(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          {showBreakdown ? "▲" : "▼"} Konfidensanalys
        </button>
        {showBreakdown && (
          <div className="mt-2 space-y-1.5">
            {Object.entries(confidenceBreakdown).map(([k, v]) => (
              <BreakdownRow key={k} label={BREAKDOWN_LABELS[k] ?? k} value={v} />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {!rejecting ? (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isModified ? "Godkänn ändrat" : "Godkänn"} →
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={submitting}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Avvisa
          </button>
          {isModified && (
            <button
              type="button"
              onClick={() => setEditedEntries(entries)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Återställ
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <input
            autoFocus
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Varför avvisas förslaget? (hjälper AI att lära sig)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Avvisa
            </button>
            <button
              type="button"
              onClick={() => { setRejecting(false); setRejectReason("") }}
              className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
