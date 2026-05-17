"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams }                         from "next/navigation"

type VatPeriod = {
  id:          string
  periodType:  string
  periodStart: string
  periodEnd:   string
  status:      string
  box05:       string | null
  box06:       string | null
  box07:       string | null
  box10:       string | null
  box11:       string | null
  box12:       string | null
  box48:       string | null
  box49:       string | null
  calculatedAt: string | null
  lockedAt:     string | null
}

const STATUS_LABEL: Record<string, string> = {
  open:       "Öppen",
  calculated: "Beräknad",
  submitted:  "Inlämnad",
  locked:     "Låst",
}

const STATUS_COLOR: Record<string, string> = {
  open:       "bg-gray-100 text-gray-600",
  calculated: "bg-blue-100 text-blue-700",
  submitted:  "bg-purple-100 text-purple-700",
  locked:     "bg-green-100 text-green-700",
}

const TYPE_LABEL: Record<string, string> = {
  monthly:   "Månadsvis",
  quarterly: "Kvartalsvis",
  yearly:    "Helårsvis",
}

function fmt(ore: string | null): string {
  if (ore == null) return "—"
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(Number(ore) / 100) + " kr"
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE")
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function vatDueDate(period: VatPeriod): Date {
  const end = new Date(period.periodEnd)
  if (period.periodType === "monthly") {
    return new Date(end.getFullYear(), end.getMonth() + 1, 26)
  }
  if (period.periodType === "quarterly") {
    const q = Math.floor(end.getMonth() / 3)
    const dues = [
      new Date(end.getFullYear(), 4, 12),
      new Date(end.getFullYear(), 7, 17),
      new Date(end.getFullYear(), 10, 17),
      new Date(end.getFullYear() + 1, 1, 12),
    ]
    return dues[q]
  }
  return new Date(end.getFullYear() + 1, 2, 26)
}

export default function VatPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  void orgSlug

  const [periods,  setPeriods]  = useState<VatPeriod[]>([])
  const [selected, setSelected] = useState<VatPeriod | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [working,  setWorking]  = useState(false)
  const [error,    setError]    = useState("")
  const [showNew,  setShowNew]  = useState(false)

  // New period form
  const [newType,  setNewType]  = useState("quarterly")
  const [newStart, setNewStart] = useState("")
  const [newEnd,   setNewEnd]   = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/tax/vat-periods")
    if (res.ok) {
      const d = await res.json()
      setPeriods(d.periods ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function calculate(id: string) {
    setWorking(true); setError("")
    const res = await fetch(`/api/tax/vat-periods/${id}/calculate`, { method: "POST" })
    if (res.ok) {
      await load()
      const d = await res.json()
      setSelected(d.period ?? null)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Fel vid beräkning")
    }
    setWorking(false)
  }

  async function lock(id: string) {
    if (!confirm("Låsa perioden? Beloppen fryses och kan inte ändras.")) return
    setWorking(true); setError("")
    const res = await fetch(`/api/tax/vat-periods/${id}/lock`, { method: "POST" })
    if (res.ok) {
      await load()
      const d = await res.json()
      setSelected(d.period ?? null)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Fel vid låsning")
    }
    setWorking(false)
  }

  async function createPeriod() {
    setWorking(true); setError("")
    const res = await fetch("/api/tax/vat-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodType: newType, periodStart: newStart, periodEnd: newEnd }),
    })
    if (res.ok) {
      setShowNew(false); setNewStart(""); setNewEnd("")
      await load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Fel")
    }
    setWorking(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Momsdeklaration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hantera och lås momsperioder</p>
        </div>
        <button
          onClick={() => setShowNew(v => !v)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Ny period
        </button>
      </div>

      {/* New period form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Skapa ny momsperiod</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Periodicitet</label>
              <select value={newType} onChange={e => setNewType(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="monthly">Månadsvis</option>
                <option value="quarterly">Kvartalsvis</option>
                <option value="yearly">Helårsvis</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Från</label>
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Till</label>
              <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Avbryt</button>
            <button onClick={createPeriod} disabled={!newStart || !newEnd || working}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {working ? "Skapar…" : "Skapa"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {/* Period list */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Laddar…</div>
            ) : periods.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                <p>Inga perioder än.</p>
                <button onClick={() => setShowNew(true)} className="mt-2 text-indigo-600 hover:underline text-xs">
                  Skapa din första period →
                </button>
              </div>
            ) : (
              <ul>
                {periods.map((p, i) => {
                  const due   = vatDueDate(p)
                  const days  = daysUntil(due.toISOString())
                  const late  = days < 0 && p.status !== "locked" && p.status !== "submitted"
                  const soon  = days >= 0 && days <= 7 && p.status === "open"

                  return (
                    <li key={p.id}
                      onClick={() => { setSelected(p); setError("") }}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                        selected?.id === p.id ? "bg-indigo-50" : "hover:bg-gray-50"
                      } ${i === 0 ? "" : ""}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}
                        </p>
                        <p className="text-xs text-gray-400">{TYPE_LABEL[p.periodType]}</p>
                        {late && <p className="text-xs text-red-500 font-medium mt-0.5">Förfallen!</p>}
                        {soon && <p className="text-xs text-amber-600 mt-0.5">Förfaller om {days} dagar</p>}
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLOR[p.status]}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="col-span-3">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 flex items-center justify-center">
              <p className="text-sm text-gray-400">Välj en period för att se detaljer</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {fmtDate(selected.periodStart)} – {fmtDate(selected.periodEnd)}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Förfaller {vatDueDate(selected).toLocaleDateString("sv-SE")}
                    {selected.status !== "locked" && selected.status !== "submitted" && (() => {
                      const d = daysUntil(vatDueDate(selected).toISOString())
                      return d < 0
                        ? <span className="ml-1 text-red-500 font-medium">({Math.abs(d)} dagar sedan)</span>
                        : <span className="ml-1 text-gray-500">(om {d} dagar)</span>
                    })()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selected.status !== "locked" && (
                    <button onClick={() => calculate(selected.id)} disabled={working}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      {working ? "…" : "Beräkna"}
                    </button>
                  )}
                  {selected.status === "calculated" && (
                    <button onClick={() => lock(selected.id)} disabled={working}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {working ? "…" : "Lås period"}
                    </button>
                  )}
                </div>
              </div>

              {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              {selected.box10 == null && selected.status === "open" ? (
                <p className="text-sm text-gray-400 italic py-4">Klicka "Beräkna" för att hämta momsbelopp från bokföringen.</p>
              ) : (
                <div className="space-y-4">
                  {/* Section A */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      A. Momspliktiga försäljningar
                    </p>
                    <div className="space-y-1">
                      {[
                        { ruta: "05", label: "Skattepliktig försäljning 25 %", val: selected.box05 },
                        { ruta: "06", label: "Skattepliktig försäljning 12 %", val: selected.box06 },
                        { ruta: "07", label: "Skattepliktig försäljning 6 %",  val: selected.box07 },
                      ].map(r => (
                        <div key={r.ruta} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                          <span className="text-sm text-gray-700">
                            <span className="font-mono text-xs text-gray-400 w-8 inline-block">Ruta {r.ruta}</span>
                            {" "}{r.label}
                          </span>
                          <span className="text-sm tabular-nums text-gray-900">{fmt(r.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section B */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      B. Utgående moms
                    </p>
                    <div className="space-y-1">
                      {[
                        { ruta: "10", label: "Utgående moms 25 %", val: selected.box10 },
                        { ruta: "11", label: "Utgående moms 12 %", val: selected.box11 },
                        { ruta: "12", label: "Utgående moms 6 %",  val: selected.box12 },
                      ].map(r => (
                        <div key={r.ruta} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                          <span className="text-sm text-gray-700">
                            <span className="font-mono text-xs text-gray-400 w-8 inline-block">Ruta {r.ruta}</span>
                            {" "}{r.label}
                          </span>
                          <span className="text-sm tabular-nums text-gray-900">{fmt(r.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section C */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      C. Ingående moms
                    </p>
                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <span className="text-sm text-gray-700">
                        <span className="font-mono text-xs text-gray-400 w-8 inline-block">Ruta 48</span>
                        {" "}Ingående moms (avdragsgill)
                      </span>
                      <span className="text-sm tabular-nums text-gray-900">{fmt(selected.box48)}</span>
                    </div>
                  </div>

                  {/* Box 49 — highlighted */}
                  <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                    Number(selected.box49 ?? 0) > 0
                      ? "bg-red-50 border border-red-100"
                      : "bg-green-50 border border-green-100"
                  }`}>
                    <div>
                      <span className="font-mono text-xs text-gray-400">Ruta 49</span>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {Number(selected.box49 ?? 0) >= 0 ? "Moms att betala" : "Moms att återfå"}
                      </p>
                    </div>
                    <span className={`text-lg font-bold tabular-nums ${
                      Number(selected.box49 ?? 0) > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {fmt(selected.box49 ? Math.abs(Number(selected.box49)).toString() : null)}
                    </span>
                  </div>

                  {selected.lockedAt && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      Låst {new Date(selected.lockedAt).toLocaleDateString("sv-SE")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
