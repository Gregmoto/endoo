"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type PriceList = {
  id:        string
  name:      string
  currency:  string
  priceMode: string
  isActive:  boolean
  isDefault: boolean
}

export default function PriceListsPage() {
  const [lists, setLists]     = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState({ name: "", currency: "SEK", priceMode: "excl_vat", isActive: true, isDefault: false })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState("")

  async function load() {
    const res = await fetch("/api/settings/price-lists")
    if (res.ok) setLists(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function startAdd() {
    setEditId("new")
    setForm({ name: "", currency: "SEK", priceMode: "excl_vat", isActive: true, isDefault: false })
    setError("")
  }

  function startEdit(l: PriceList) {
    setEditId(l.id)
    setForm({ name: l.name, currency: l.currency, priceMode: l.priceMode, isActive: l.isActive, isDefault: l.isDefault })
    setError("")
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    const isNew = editId === "new"
    const res = await fetch(isNew ? "/api/settings/price-lists" : `/api/settings/price-lists/${editId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) { setEditId(null); await load() }
    else { const d = await res.json(); setError(d.error ?? "Något gick fel") }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Ta bort prislistan?")) return
    await fetch(`/api/settings/price-lists/${id}`, { method: "DELETE" })
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prislistor</CardTitle>
          <Button size="sm" onClick={startAdd}>+ Ny prislista</Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Namn</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valuta</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Prisläge</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lists.map(l => (
                <tr key={l.id} className="border-b border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-foreground font-medium">
                    {l.name}
                    {l.isDefault && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-brand-50 text-brand-700">Standard</span>}
                  </td>
                  <td className="px-4 py-3 text-foreground">{l.currency}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.priceMode === "incl_vat" ? "Inkl. moms" : "Exkl. moms"}</td>
                  <td className="px-4 py-3">
                    {!l.isActive && <span className="text-xs text-muted-foreground">Inaktiv</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => startEdit(l)} className="text-xs text-muted-foreground hover:text-foreground">Redigera</button>
                      {!l.isDefault && (
                        <button onClick={() => handleDelete(l.id)} className="text-xs text-muted-foreground hover:text-destructive">Ta bort</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {lists.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Inga prislistor</td></tr>
              )}
            </tbody>
          </table>

          {editId && (
            <div className="border-t border bg-muted/10 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{editId === "new" ? "Ny prislista" : "Redigera prislista"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Namn</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={cls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Valuta</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={cls}>
                    {["SEK","EUR","USD","GBP","NOK","DKK"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Prisläge</label>
                  <select value={form.priceMode} onChange={e => setForm(f => ({ ...f, priceMode: e.target.value }))} className={cls}>
                    <option value="excl_vat">Exklusive moms</option>
                    <option value="incl_vat">Inklusive moms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.isActive ? "true" : "false"} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "true" }))} className={cls}>
                    <option value="true">Aktiv</option>
                    <option value="false">Inaktiv</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Sparar…" : "Spara"}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Avbryt</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const cls = "w-full px-3 py-1.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
