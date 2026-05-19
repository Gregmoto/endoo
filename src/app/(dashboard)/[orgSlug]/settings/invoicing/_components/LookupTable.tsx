"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type LookupItem = {
  id:        string
  code:      string
  name:      string
  isActive:  boolean
  isDefault: boolean
  [key: string]: unknown
}

type Column = {
  key:   string
  label: string
  type?: "text" | "number" | "boolean"
}

type LookupTableProps = {
  title:        string
  apiPath:      string
  columns:      Column[]
  emptyForm:    Record<string, unknown>
  showSeedBtn?: boolean
}

export function LookupTable({ title, apiPath, columns, emptyForm, showSeedBtn }: LookupTableProps) {
  const [items, setItems]     = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState<Record<string, unknown>>(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError]     = useState("")

  async function load() {
    const res = await fetch(apiPath)
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(item: LookupItem) {
    setEditId(item.id)
    const f: Record<string, unknown> = {}
    columns.forEach(c => { f[c.key] = item[c.key] ?? "" })
    f.isActive  = item.isActive
    f.isDefault = item.isDefault
    setForm(f)
    setError("")
  }

  function startAdd() {
    setEditId("new")
    setForm(emptyForm)
    setError("")
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    const isNew = editId === "new"
    const url   = isNew ? apiPath : `${apiPath}/${editId}`
    const res   = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) { setEditId(null); await load() }
    else { const d = await res.json(); setError(d.error ?? "Något gick fel") }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Ta bort den här posten?")) return
    const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" })
    if (res.ok) await load()
  }

  async function seedDefaults() {
    setSeeding(true)
    await fetch("/api/settings/invoicing/seed-defaults", { method: "POST" })
    await load()
    setSeeding(false)
  }

  async function toggleDefault(item: LookupItem) {
    await fetch(`${apiPath}/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, isDefault: true }),
    })
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          {showSeedBtn && items.length === 0 && (
            <Button size="sm" variant="outline" onClick={seedDefaults} disabled={seeding}>
              {seeding ? "Fyller…" : "Fyll med standardvärden"}
            </Button>
          )}
          <Button size="sm" onClick={startAdd}>+ Lägg till</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border bg-muted/30">
              {columns.map(c => (
                <th key={c.key} className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {c.label}
                </th>
              ))}
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border last:border-0 hover:bg-muted/20">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3 text-foreground">
                    {String(item[c.key] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {item.isDefault && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700">
                        Standard
                      </span>
                    )}
                    {!item.isActive && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        Inaktiv
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {!item.isDefault && (
                      <button onClick={() => toggleDefault(item)} className="text-xs text-muted-foreground hover:text-foreground">
                        Sätt standard
                      </button>
                    )}
                    <button onClick={() => startEdit(item)} className="text-xs text-muted-foreground hover:text-foreground">
                      Redigera
                    </button>
                    {!item.isDefault && (
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-muted-foreground hover:text-destructive">
                        Ta bort
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Inga poster hittades
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {editId && (
          <div className="border-t border bg-muted/10 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editId === "new" ? "Ny post" : "Redigera"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {columns.map(c => (
                <div key={c.key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{c.label}</label>
                  {c.type === "boolean" ? (
                    <select
                      value={form[c.key] ? "true" : "false"}
                      onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value === "true" }))}
                      className={inputCls}
                    >
                      <option value="true">Ja</option>
                      <option value="false">Nej</option>
                    </select>
                  ) : (
                    <input
                      type={c.type === "number" ? "number" : "text"}
                      value={String(form[c.key] ?? "")}
                      onChange={e => setForm(f => ({ ...f, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value }))}
                      className={inputCls}
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Aktiv</label>
                <select value={form.isActive ? "true" : "false"} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "true" }))} className={inputCls}>
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
  )
}

const inputCls = "w-full px-3 py-1.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
