"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface Suggestion {
  accountNumber: string
  accountName:   string
  side:          "debit" | "credit"
  confidence:    number
  reason:        string
}

interface AccountSuggestProps {
  description: string
  amountOre?:  number
  onSelect:    (s: Suggestion) => void
  disabled?:   boolean
}

function confidenceDot(c: number) {
  if (c >= 0.85) return <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Hög träffsäkerhet" />
  if (c >= 0.60) return <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" title="Medel träffsäkerhet" />
  return <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" title="Låg träffsäkerhet" />
}

export function AccountSuggest({ description, amountOre, onSelect, disabled }: AccountSuggestProps) {
  const [suggestions, setSuggestions]   = useState<Suggestion[]>([])
  const [loading, setLoading]           = useState(false)
  const [open, setOpen]                 = useState(false)
  const containerRef                    = useRef<HTMLDivElement>(null)
  const timerRef                        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (desc: string) => {
    if (desc.trim().length < 3) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch("/api/ai/suggest-account", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ description: desc, amountOre }),
      })
      if (!res.ok) return
      const data = await res.json() as { suggestions: Suggestion[] }
      setSuggestions(data.suggestions ?? [])
      setOpen((data.suggestions ?? []).length > 0)
    } catch {
      // silent — suggestions are non-critical
    } finally {
      setLoading(false)
    }
  }, [amountOre])

  useEffect(() => {
    if (disabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(description), 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [description, disabled, fetchSuggestions])

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (!open && !loading) return null

  return (
    <div ref={containerRef} className="absolute left-0 right-0 top-full mt-1 z-30">
      {loading && suggestions.length === 0 && (
        <div className="bg-card border border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full" />
          AI föreslår konton…
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div className="bg-card border border rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">
            <span>✦</span> AI-förslag
          </div>
          {suggestions.map((s) => (
            <button
              key={s.accountNumber}
              type="button"
              onClick={() => { onSelect(s); setOpen(false) }}
              className="w-full px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                {confidenceDot(s.confidence)}
                <span className="font-mono text-xs font-semibold text-foreground">{s.accountNumber}</span>
                <span className="text-sm text-foreground flex-1">{s.accountName}</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  s.side === "debit"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-purple-50 text-purple-700"
                }`}>
                  {s.side === "debit" ? "D" : "K"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 ml-4 pl-2.5">{s.reason}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
