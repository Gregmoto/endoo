"use client"

import { useState, useEffect, useRef, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { SearchResult, SearchEntityType } from "@/lib/search/types"
import { ENTITY_ICONS, ENTITY_LABELS } from "@/lib/search/types"

// ─── Recent history (localStorage) ───────────────────────────────────────────

const MAX_RECENTS = 12

interface RecentEntry {
  entityType: SearchEntityType
  entityId:   string
  title:      string
  subtitle:   string | null
  url:        string
  visitedAt:  number
}

function recentsKey(orgId: string) { return `endoo:recents:${orgId}` }

function loadRecents(orgId: string): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(recentsKey(orgId)) ?? "[]")
  } catch { return [] }
}

function saveRecent(orgId: string, entry: Omit<RecentEntry, "visitedAt">) {
  try {
    const existing = loadRecents(orgId).filter(r => r.entityId !== entry.entityId)
    const next: RecentEntry[] = [{ ...entry, visitedAt: Date.now() }, ...existing].slice(0, MAX_RECENTS)
    localStorage.setItem(recentsKey(orgId), JSON.stringify(next))
  } catch { /* storage unavailable */ }
}

// ─── Type filter chips ────────────────────────────────────────────────────────

const TYPE_FILTERS: { value: SearchEntityType | "all"; label: string }[] = [
  { value: "all",              label: "Alla"         },
  { value: "invoice",          label: "Fakturor"     },
  { value: "contact",          label: "Kunder"       },
  { value: "product",          label: "Produkter"    },
  { value: "supplier_invoice", label: "Lev.fakturor" },
  { value: "journal",          label: "Verifikat"    },
  { value: "member",           label: "Användare"    },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  orgSlug: string
  orgId:   string
}

export function CommandPalette({ open, onClose, orgSlug, orgId }: Props) {
  const router               = useRouter()
  const inputRef             = useRef<HTMLInputElement>(null)
  const listRef              = useRef<HTMLDivElement>(null)
  const debounceRef          = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition]  = useTransition()

  const [query,    setQuery]    = useState("")
  const [typeFilter, setTypeFilter] = useState<SearchEntityType | "all">("all")
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [recents,  setRecents]  = useState<RecentEntry[]>([])
  const [loading,  setLoading]  = useState(false)
  const [cursor,   setCursor]   = useState(0)

  // Reset state on open
  useEffect(() => {
    if (!open) return
    setQuery("")
    setResults([])
    setCursor(0)
    setTypeFilter("all")
    setRecents(loadRecents(orgId))
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [open, orgId])

  // Fetch results
  const fetchResults = useCallback(async (q: string, type: SearchEntityType | "all") => {
    if (!q.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    try {
      const typesParam = type === "all" ? "" : `&types=${type}`
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}${typesParam}&limit=25`)
      const data: SearchResult[] = res.ok ? await res.json() : []
      setResults(data)
      setCursor(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(v: string) {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(v, typeFilter), 150)
  }

  function handleTypeChange(t: SearchEntityType | "all") {
    setTypeFilter(t)
    fetchResults(query, t)
  }

  // Navigate to a result
  const navigate = useCallback((result: SearchResult | RecentEntry, newTab = false) => {
    const url = `/${orgSlug}${result.url}`
    saveRecent(orgId, {
      entityType: result.entityType,
      entityId:   result.entityId,
      title:      result.title,
      subtitle:   result.subtitle ?? null,
      url:        result.url,
    })
    onClose()
    startTransition(() => {
      if (newTab) {
        window.open(url, "_blank", "noopener noreferrer")
      } else {
        router.push(url)
      }
    })
  }, [orgSlug, orgId, onClose, router])

  // Group results by entity type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.entityType]) acc[r.entityType] = []
    acc[r.entityType].push(r)
    return acc
  }, {})

  // Flat list for keyboard nav
  const flatList: (SearchResult | RecentEntry)[] = query.trim()
    ? results
    : recents

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, flatList.length - 1))
      scrollCursorIntoView()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
      scrollCursorIntoView()
    } else if (e.key === "Enter") {
      if (flatList[cursor]) navigate(flatList[cursor], e.metaKey || e.ctrlKey)
    } else if (e.key === "Escape") {
      if (query) { setQuery(""); setResults([]) } else { onClose() }
    }
  }

  function scrollCursorIntoView() {
    setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`)
      el?.scrollIntoView({ block: "nearest" })
    }, 0)
  }

  if (!open) return null

  const showRecents  = !query.trim() && recents.length > 0
  const showResults  = !!query.trim()
  const showEmpty    = showResults && !loading && results.length === 0

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "70vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border">
          <span className="text-muted-foreground flex-shrink-0">
            {loading
              ? <span className="inline-block w-4 h-4 border-2 border border-t-brand-500 rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
            }
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Sök fakturor, kunder, produkter…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={onKey}
            className="flex-1 text-sm outline-none placeholder:text-muted-foreground text-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus() }}
              className="text-muted-foreground hover:text-muted-foreground flex-shrink-0 text-xs"
            >
              ✕
            </button>
          )}
          <kbd className="hidden sm:inline text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">Esc</kbd>
        </div>

        {/* Type filter chips */}
        {showResults && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 overflow-x-auto">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => handleTypeChange(f.value)}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  typeFilter === f.value
                    ? "bg-brand-100 text-brand-700"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Results / Recents */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">

          {/* Recent items */}
          {showRecents && (
            <div>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Senaste</p>
              {recents.map((r, i) => (
                <ResultRow
                  key={r.entityId}
                  icon={ENTITY_ICONS[r.entityType]}
                  label={ENTITY_LABELS[r.entityType]}
                  title={r.title}
                  subtitle={r.subtitle}
                  selected={cursor === i}
                  index={i}
                  onClick={(newTab) => navigate(r, newTab)}
                  onMouseEnter={() => setCursor(i)}
                />
              ))}
            </div>
          )}

          {/* Grouped search results */}
          {showResults && !showEmpty && (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {ENTITY_LABELS[type as SearchEntityType]}
                </p>
                {items.map(r => {
                  const globalIdx = results.indexOf(r)
                  return (
                    <ResultRow
                      key={r.entityId}
                      icon={ENTITY_ICONS[r.entityType]}
                      label={ENTITY_LABELS[r.entityType]}
                      title={r.title}
                      subtitle={r.subtitle}
                      selected={cursor === globalIdx}
                      index={globalIdx}
                      onClick={(newTab) => navigate(r, newTab)}
                      onMouseEnter={() => setCursor(globalIdx)}
                    />
                  )
                })}
              </div>
            ))
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Inga resultat för <strong>"{query}"</strong></p>
              <p className="text-xs text-muted-foreground mt-1">Prova att söka på fakturanummer, kundnamn eller produkt</p>
            </div>
          )}

          {/* No recents + no query */}
          {!showResults && !showRecents && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Börja skriva för att söka…
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border flex items-center gap-4 text-xs text-muted-foreground">
          <span>↑↓ navigera</span>
          <span>↵ öppna</span>
          <span>⌘↵ ny flik</span>
          <span className="ml-auto">Esc stäng</span>
        </div>
      </div>
    </div>
  )
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  icon, title, subtitle, selected, index, onClick, onMouseEnter,
}: {
  icon:         string
  label:        string
  title:        string
  subtitle:     string | null
  selected:     boolean
  index:        number
  onClick:      (newTab: boolean) => void
  onMouseEnter: () => void
}) {
  return (
    <button
      data-idx={index}
      onClick={e => onClick(e.metaKey || e.ctrlKey)}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selected ? "bg-brand-50" : "hover:bg-accent"
      }`}
    >
      <span className="flex-shrink-0 w-5 text-center text-sm text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
      </div>
    </button>
  )
}
