"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { SnapshotClient } from "./types"
import { healthLabel } from "./HealthBar"

interface Props {
  open:    boolean
  onClose: () => void
}

export function ClientSwitcher({ open, onClose }: Props) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query,   setQuery]   = useState("")
  const [clients, setClients] = useState<SnapshotClient[]>([])
  const [pins,    setPins]    = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor,  setCursor]  = useState(0)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setCursor(0)
    setLoading(true)
    Promise.all([
      fetch("/api/agency/clients").then(r => r.ok ? r.json() : { clients: [] }),
      fetch("/api/agency/pins").then(r => r.ok ? r.json() : []),
    ]).then(([data, pinnedIds]: [{ clients: SnapshotClient[] }, string[]]) => {
      setClients(data.clients ?? [])
      setPins(pinnedIds)
      setLoading(false)
    })
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = (() => {
    const q = query.toLowerCase().trim()
    const pinSet = new Set(pins)
    const sorted = [
      ...clients.filter(c => pinSet.has(c.clientId)),
      ...clients.filter(c => !pinSet.has(c.clientId)),
    ]
    return q ? sorted.filter(c => c.clientName.toLowerCase().includes(q) || c.clientSlug.includes(q)) : sorted
  })()

  const navigate = useCallback((client: SnapshotClient) => {
    onClose()
    router.push(`/${client.clientSlug}`)
  }, [router, onClose])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === "Enter") {
      if (filtered[cursor]) navigate(filtered[cursor])
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border">
          <span className="text-muted-foreground text-sm">⌘</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Byt klient…"
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={onKey}
            className="flex-1 text-sm outline-none placeholder-gray-400"
          />
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Esc</span>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Inga klienter hittades</div>
          ) : (
            filtered.map((c, i) => {
              const hl = healthLabel(c.healthScore)
              const pinned = pins.includes(c.clientId)
              return (
                <button
                  key={c.clientId}
                  onClick={() => navigate(c)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === cursor ? "bg-brand-50" : "hover:bg-accent"
                  }`}
                >
                  {pinned && <span className="text-brand-400 flex-shrink-0 text-sm">★</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.clientSlug}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.errorCount > 0 && (
                      <span className="text-xs font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                        ● {c.errorCount}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hl.cls}`}>
                      {c.healthScore}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border flex items-center gap-3 text-xs text-muted-foreground">
          <span>↑↓ navigera</span>
          <span>↵ öppna</span>
          <span>Esc stäng</span>
        </div>
      </div>
    </div>
  )
}
