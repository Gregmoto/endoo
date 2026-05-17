"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams }                         from "next/navigation"

const ALL_SCOPES = [
  { value: "invoices:read",   label: "Fakturor (läs)" },
  { value: "contacts:read",   label: "Kunder (läs)" },
  { value: "products:read",   label: "Produkter (läs)" },
  { value: "journals:read",   label: "Verifikat (läs)" },
  { value: "inventory:read",  label: "Lager (läs)" },
]

type ApiKey = {
  id:          string
  name:        string
  keyPrefix:   string
  scopes:      string[]
  environment: string
  isActive:    boolean
  revokedAt:   string | null
  expiresAt:   string | null
  lastUsedAt:  string | null
  createdAt:   string
}

function relativeDate(d: string | null) {
  if (!d) return "—"
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "Idag"
  if (days === 1) return "Igår"
  if (days < 30)  return `${days} dagar sedan`
  return new Date(d).toLocaleDateString("sv-SE")
}

export default function ApiSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [keys,     setKeys]     = useState<ApiKey[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newKey,   setNewKey]   = useState<string | null>(null)   // shown once after creation

  // Form state
  const [name,        setName]        = useState("")
  const [scopes,      setScopes]      = useState<string[]>(["invoices:read"])
  const [environment, setEnvironment] = useState<"live" | "test">("live")
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/api-keys", {
      headers: { "x-org-slug": orgSlug },
    })
    if (res.ok) {
      const d = await res.json()
      setKeys(d.keys)
    }
    setLoading(false)
  }, [orgSlug])

  useEffect(() => { load() }, [load])

  async function create() {
    setSaving(true); setError("")
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-org-slug": orgSlug },
      body: JSON.stringify({ name, scopes, environment }),
    })
    const d = await res.json()
    if (res.ok) {
      setNewKey(d.key)
      setShowForm(false)
      setName(""); setScopes(["invoices:read"]); setEnvironment("live")
      await load()
    } else {
      setError(d.error?.message ?? "Kunde inte skapa nyckel")
    }
    setSaving(false)
  }

  async function revoke(id: string) {
    if (!confirm("Återkalla denna API-nyckel? Det går inte att ångra.")) return
    await fetch(`/api/api-keys/${id}`, {
      method: "DELETE",
      headers: { "x-org-slug": orgSlug },
    })
    await load()
  }

  function toggleScope(s: string) {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API-nycklar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Skapa nycklar för att anropa Endoo API från externa system.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setNewKey(null) }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Ny nyckel
        </button>
      </div>

      {/* One-time key reveal */}
      {newKey && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-green-800 mb-2">Nyckel skapad — kopiera den nu!</p>
          <p className="text-xs text-green-700 mb-3">
            Denna nyckel visas bara en gång. Förvara den säkert — den ger åtkomst till ditt konto.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-green-300 text-green-900 text-xs font-mono px-3 py-2 rounded-lg break-all select-all">
              {newKey}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(newKey); alert("Kopierad!") }}
              className="px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Kopiera
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-green-700 hover:underline">
            Jag har sparat nyckeln — stäng
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-indigo-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ny API-nyckel</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Namn / etikett</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="t.ex. Zapier-integration"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Miljö</label>
              <div className="flex gap-3">
                {(["live", "test"] as const).map(env => (
                  <label key={env} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="env"
                      value={env}
                      checked={environment === env}
                      onChange={() => setEnvironment(env)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm text-gray-700 capitalize">{env === "live" ? "Live (produktion)" : "Test"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Behörigheter (scopes)</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SCOPES.map(s => (
                  <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes.includes(s.value)}
                      onChange={() => toggleScope(s.value)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
              Avbryt
            </button>
            <button
              onClick={create}
              disabled={!name || scopes.length === 0 || saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Skapar…" : "Skapa nyckel"}
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Laddar…</div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">Inga API-nycklar än. Skapa en för att komma igång.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Namn", "Nyckel", "Scopes", "Miljö", "Senast använd", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                      {k.keyPrefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map(s => (
                        <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      k.environment === "live"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {k.environment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{relativeDate(k.lastUsedAt)}</td>
                  <td className="px-4 py-3">
                    {k.revokedAt ? (
                      <span className="text-xs text-red-500 font-medium">Återkallad</span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Aktiv</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revokedAt && (
                      <button
                        onClick={() => revoke(k.id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Återkalla
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API reference summary */}
      <div className="mt-8 bg-gray-50 rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Snabbreferens</h3>
        <div className="space-y-2">
          {[
            { method: "GET", path: "/api/v1/invoices",  scope: "invoices:read",  desc: "Lista fakturor" },
            { method: "GET", path: "/api/v1/contacts",  scope: "contacts:read",  desc: "Lista kunder" },
            { method: "GET", path: "/api/v1/products",  scope: "products:read",  desc: "Lista produkter" },
            { method: "GET", path: "/api/v1/journals",  scope: "journals:read",  desc: "Lista verifikat" },
            { method: "GET", path: "/api/v1/inventory", scope: "inventory:read", desc: "Lagersaldo" },
          ].map(e => (
            <div key={e.path} className="flex items-center gap-3 text-xs">
              <span className="font-mono font-bold text-indigo-700 w-10">{e.method}</span>
              <code className="font-mono text-gray-700 w-44">{e.path}</code>
              <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono">{e.scope}</span>
              <span className="text-gray-500">{e.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1 font-medium">Autentisering</p>
          <code className="text-xs font-mono text-gray-700">
            Authorization: Bearer endo_live_…
          </code>
        </div>
      </div>
    </div>
  )
}
