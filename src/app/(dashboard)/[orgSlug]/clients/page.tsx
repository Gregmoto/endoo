"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { SnapshotClient, AgencyKpis } from "@/components/agency/types"
import { AgencyKpiStrip } from "@/components/agency/AgencyKpiStrip"
import { ClientRow }      from "@/components/agency/ClientRow"
import { BulkActionBar }  from "@/components/agency/BulkActionBar"

const EMPTY_KPIS: AgencyKpis = {
  totalClients: 0, actionNeeded: 0, missingDocs: 0, atRisk: 0, vatDueSoon: 0,
  totalAiAnomalies: 0, avgHealthScore: 0,
}

type Sort = "health" | "name" | "activity" | "vat"

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "health",   label: "Hälsa"      },
  { value: "name",     label: "Namn"       },
  { value: "activity", label: "Aktivitet"  },
  { value: "vat",      label: "Momsfrist"  },
]

export default function AgencyClientsPage() {
  const [clients,  setClients]  = useState<SnapshotClient[]>([])
  const [kpis,     setKpis]     = useState<AgencyKpis>(EMPTY_KPIS)
  const [pins,     setPins]     = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState("")
  const [filter,   setFilter]   = useState("all")
  const [sort,     setSort]     = useState<Sort>("health")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (q: string, f: string, s: Sort) => {
    const params = new URLSearchParams({ search: q, filter: f, sort: s })
    const res = await fetch(`/api/agency/clients?${params}`)
    if (!res.ok) return
    const data = await res.json()
    setClients(data.clients ?? [])
    setKpis(data.kpis ?? EMPTY_KPIS)
    setLoading(false)
  }, [])

  // Initial load + pins
  useEffect(() => {
    load(search, filter, sort)
    fetch("/api/agency/pins").then(r => r.ok ? r.json() : []).then((ids: string[]) => {
      setPins(new Set(ids))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced search
  function handleSearchChange(v: string) {
    setSearch(v)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => load(v, filter, sort), 350)
  }

  function handleFilterChange(f: string) {
    setFilter(f)
    load(search, f, sort)
  }

  function handleSortChange(s: Sort) {
    setSort(s)
    load(search, filter, s)
  }

  function handleSelect(id: string, on: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      on ? next.add(id) : next.delete(id)
      return next
    })
  }

  function handleSelectAll() {
    if (selected.size === clients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clients.map(c => c.clientId)))
    }
  }

  async function handlePin(clientId: string) {
    const res = await fetch("/api/agency/pins", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clientId }),
    })
    if (!res.ok) return
    const { pinned } = await res.json()
    setPins(prev => {
      const next = new Set(prev)
      pinned ? next.add(clientId) : next.delete(clientId)
      return next
    })
  }

  function handleRefresh() {
    load(search, filter, sort)
  }

  // Pinned clients bubble to top
  const sorted = [
    ...clients.filter(c => pins.has(c.clientId)),
    ...clients.filter(c => !pins.has(c.clientId)),
  ]

  const allSelected = clients.length > 0 && selected.size === clients.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Klienter</h1>
        <p className="text-sm text-gray-400 mt-0.5">Realtidshälsa och status för alla dina kunder</p>
      </div>

      <AgencyKpiStrip
        kpis={kpis}
        activeFilter={filter}
        onFilterChange={handleFilterChange}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-56">
          <input
            type="search"
            placeholder="Sök klient…"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sortera:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSortChange(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                sort === opt.value
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSelectAll}
          className="text-xs text-gray-500 hover:text-gray-800 transition-colors ml-auto"
        >
          {allSelected ? "Avmarkera alla" : someSelected ? `${selected.size} valda` : "Välj alla"}
        </button>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">◈</p>
          <p className="font-medium text-gray-900">Inga klienter hittades</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter !== "all" ? "Prova att ta bort filtret" : "Koppla klienter via plattformsinställningarna"}
          </p>
          {filter !== "all" && (
            <button
              onClick={() => handleFilterChange("all")}
              className="mt-3 text-sm text-brand-600 hover:underline"
            >
              Visa alla
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 pb-24">
          {sorted.map(client => (
            <ClientRow
              key={client.clientId}
              client={client}
              selected={selected.has(client.clientId)}
              onSelect={handleSelect}
              pinned={pins.has(client.clientId)}
              onPin={handlePin}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      <BulkActionBar
        selectedIds={Array.from(selected)}
        onClear={() => setSelected(new Set())}
        onDone={() => { setSelected(new Set()); handleRefresh() }}
      />
    </div>
  )
}
