"use client"

import { useState, useEffect, useCallback } from "react"

type AccountItem = {
  id:           string
  number:       string
  name:         string
  type:         string
  normalSide:   string
  reportClass:  string
  vatCode:      string | null
  isActive:     boolean
  isSystem:     boolean
  description:  string | null
}

type Section = {
  type:        string
  label:       string
  accounts:    AccountItem[]
}

const TYPE_LABEL: Record<string, string> = {
  asset:     "Tillgångar",
  liability: "Skulder",
  equity:    "Eget kapital",
  income:    "Intäkter",
  expense:   "Kostnader",
}

const TYPE_COLOR: Record<string, string> = {
  asset:     "bg-blue-50 text-blue-700 border-blue-100",
  liability: "bg-red-50 text-red-700 border-red-100",
  equity:    "bg-violet-50 text-violet-700 border-violet-100",
  income:    "bg-green-50 text-green-700 border-green-100",
  expense:   "bg-orange-50 text-orange-700 border-orange-100",
}

export default function AccountsPage() {
  const [sections,  setSections]  = useState<Section[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [typeFilter, setTypeFilter] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/accounting/accounts?grouped=true")
    if (res.ok) {
      const d = await res.json()
      setSections(d.sections ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = sections
    .filter(s => !typeFilter || s.type === typeFilter)
    .map(s => ({
      ...s,
      accounts: s.accounts.filter(a =>
        !search ||
        a.number.includes(search) ||
        a.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(s => s.accounts.length > 0)

  const totalActive = sections.flatMap(s => s.accounts).filter(a => a.isActive).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontoplan</h1>
          <p className="text-sm text-gray-500 mt-0.5">BAS 2024 · {totalActive} aktiva konton</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Sök kontonummer eller namn…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Alla kontotyper</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Laddar kontoplan…</div>
      ) : (
        <div className="space-y-6">
          {filtered.map(section => (
            <div key={section.type} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Section header */}
              <div className={`px-5 py-3 border-b flex items-center gap-3 ${TYPE_COLOR[section.type] ?? "bg-gray-50 text-gray-700 border-gray-100"}`}>
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {TYPE_LABEL[section.type] ?? section.label}
                </h2>
                <span className="text-xs opacity-70">{section.accounts.length} konton</span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-20">Nr</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Kontonamn</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-20">Sida</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-24">Momskod</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {section.accounts.map(a => (
                    <tr key={a.id} className={`border-t border-gray-50 ${!a.isActive ? "opacity-40" : ""}`}>
                      <td className="px-5 py-2.5 font-mono text-xs font-semibold text-indigo-700">{a.number}</td>
                      <td className="px-5 py-2.5 text-gray-900">
                        {a.name}
                        {a.description && (
                          <span className="ml-2 text-xs text-gray-400">{a.description}</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-500 capitalize">{a.normalSide === "debit" ? "Debet" : "Kredit"}</td>
                      <td className="px-5 py-2.5">
                        {a.vatCode && (
                          <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                            {a.vatCode}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {a.isSystem && (
                          <span className="text-xs text-gray-400">BAS</span>
                        )}
                        {!a.isActive && (
                          <span className="text-xs text-gray-300">Inaktiv</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">Inga konton matchar sökningen.</div>
          )}
        </div>
      )}
    </div>
  )
}
