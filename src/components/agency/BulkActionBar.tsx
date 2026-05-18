"use client"

import { useState } from "react"

interface Props {
  selectedIds: string[]
  onClear:     () => void
  onDone:      () => void
}

type Action = "refresh_snapshots" | "send_reminder"

const ACTIONS: { value: Action; label: string }[] = [
  { value: "refresh_snapshots", label: "Uppdatera snapshots"  },
  { value: "send_reminder",     label: "Skicka påminnelse"    },
]

export function BulkActionBar({ selectedIds, onClear, onDone }: Props) {
  const [action,  setAction]  = useState<Action>("refresh_snapshots")
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setResult(null)
    try {
      const res  = await fetch("/api/agency/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: action, clientIds: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult(`Fel: ${data.error ?? "okänt"}`)
      } else {
        setResult(`Klart: ${data.succeeded} lyckades${data.failed > 0 ? `, ${data.failed} misslyckades` : ""}`)
        onDone()
      }
    } catch {
      setResult("Nätverksfel")
    } finally {
      setRunning(false)
    }
  }

  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl">
      <span className="text-sm font-medium text-gray-300">
        {selectedIds.length} vald{selectedIds.length !== 1 ? "a" : ""}
      </span>

      <select
        value={action}
        onChange={e => setAction(e.target.value as Action)}
        disabled={running}
        className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-brand-400"
      >
        {ACTIONS.map(a => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>

      <button
        onClick={run}
        disabled={running}
        className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors"
      >
        {running ? "Kör…" : "Kör"}
      </button>

      {result && (
        <span className="text-xs text-gray-300">{result}</span>
      )}

      <button
        onClick={onClear}
        disabled={running}
        className="text-muted-foreground hover:text-white ml-1 transition-colors"
        title="Avmarkera alla"
      >
        ✕
      </button>
    </div>
  )
}
