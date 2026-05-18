"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

type Org = {
  id: string
  name: string
  slug: string
  type: string
  plan: string
  isActive: boolean
  deletedAt: string | null
  createdAt: string
  _count: { members: number; invoices: number }
}

const TYPE_LABELS: Record<string, string> = { customer: "Kund", agency: "Byrå" }
const PLAN_LABELS: Record<string, string> = { free: "Gratis", starter: "Starter", pro: "Pro", agency: "Agency" }

export default function PlatformOrganizationsPage() {
  const [orgs, setOrgs]       = useState<Org[]>([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState("")
  const [type, setType]       = useState("")
  const [status, setStatus]   = useState("")
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page) })
    if (search) qs.set("search", search)
    if (type)   qs.set("type",   type)
    if (status) qs.set("status", status)
    const res = await fetch(`/api/platform/organizations?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setOrgs(d.orgs); setTotal(d.total); setPages(d.pages)
    }
    setLoading(false)
  }, [page, search, type, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, type, status])

  async function toggleActive(org: Org) {
    setToggling(org.id)
    const res = await fetch(`/api/platform/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !org.isActive }),
    })
    if (res.ok) {
      const updated = await res.json()
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, ...updated } : o))
    }
    setToggling(null)
  }

  const active   = orgs.filter(o => o.isActive && !o.deletedAt).length
  const agencies = orgs.filter(o => o.type === "agency" && !o.deletedAt).length

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Organisationer</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} totalt · {active} aktiva på sidan · {agencies} byråer</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Sök namn, slug…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 max-w-xs px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select value={type} onChange={e => setType(e.target.value)}
          className="px-3 py-2 text-sm border border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Alla typer</option>
          <option value="customer">Kund</option>
          <option value="agency">Byrå</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Alla statusar</option>
          <option value="active">Aktiva</option>
          <option value="inactive">Inaktiva</option>
          <option value="deleted">Borttagna</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Organisation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Typ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Medlemmar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Fakturor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr key={org.id} className={`border-t border hover:bg-accent ${org.deletedAt ? "opacity-50" : ""}`}>
                    <td className="px-6 py-3">
                      <Link href={`/platform/organizations/${org.id}`}
                        className="font-medium text-foreground hover:text-indigo-600">
                        {org.name}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${org.type === "agency" ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"}`}>
                        {TYPE_LABELS[org.type] ?? org.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{PLAN_LABELS[org.plan] ?? org.plan}</td>
                    <td className="px-6 py-3 text-muted-foreground">{org._count.members}</td>
                    <td className="px-6 py-3 text-muted-foreground">{org._count.invoices}</td>
                    <td className="px-6 py-3">
                      {org.deletedAt ? (
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-600">Borttagen</span>
                      ) : org.isActive ? (
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">Aktiv</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700">Inaktiv</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {!org.deletedAt && (
                        <button
                          onClick={() => toggleActive(org)}
                          disabled={toggling === org.id}
                          className={`text-xs font-medium px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
                            org.isActive
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-green-200 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {toggling === org.id ? "…" : org.isActive ? "Inaktivera" : "Aktivera"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Sida {page} av {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border rounded-lg disabled:opacity-40 hover:bg-muted">
              ← Föregående
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 border border rounded-lg disabled:opacity-40 hover:bg-muted">
              Nästa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
