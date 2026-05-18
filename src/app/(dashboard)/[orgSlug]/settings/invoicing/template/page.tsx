"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Template = {
  id:             string
  name:           string
  language:       string
  showLogo:       boolean
  showSwishQr:    boolean
  footerText:     string | null
  fScattCertified: boolean
  isDefault:      boolean
  isActive:       boolean
}

export default function TemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading]     = useState(true)
  const [editId, setEditId]       = useState<string | null>(null)
  const [form, setForm]           = useState({
    name: "", language: "sv", showLogo: true, showSwishQr: false,
    footerText: "", fScattCertified: true, isActive: true, isDefault: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  async function load() {
    const res = await fetch("/api/settings/invoice-templates")
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(t: Template) {
    setEditId(t.id)
    setForm({
      name: t.name, language: t.language, showLogo: t.showLogo,
      showSwishQr: t.showSwishQr, footerText: t.footerText ?? "",
      fScattCertified: t.fScattCertified, isActive: t.isActive, isDefault: t.isDefault,
    })
    setError("")
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    const isNew = editId === "new"
    const res = await fetch(isNew ? "/api/settings/invoice-templates" : `/api/settings/invoice-templates/${editId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, footerText: form.footerText || null }),
    })
    if (res.ok) { setEditId(null); await load() }
    else { const d = await res.json(); setError(d.error ?? "Något gick fel") }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fakturamallar</CardTitle>
          <Button size="sm" onClick={() => { setEditId("new"); setForm({ name: "", language: "sv", showLogo: true, showSwishQr: false, footerText: "", fScattCertified: true, isActive: true, isDefault: false }); setError("") }}>
            + Ny mall
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Namn</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Språk</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Swish QR</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} className="border-b border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-foreground font-medium">
                    {t.name}
                    {t.isDefault && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-brand-50 text-brand-700">Standard</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.language}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.showSwishQr ? "Ja" : "Nej"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(t)} className="text-xs text-muted-foreground hover:text-foreground">Redigera</button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">Inga mallar</td></tr>
              )}
            </tbody>
          </table>

          {editId && (
            <div className="border-t border bg-muted/10 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{editId === "new" ? "Ny mall" : "Redigera mall"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Namn</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={cls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Språk</label>
                  <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className={cls}>
                    <option value="sv">Svenska</option>
                    <option value="en">English</option>
                    <option value="no">Norsk</option>
                    <option value="da">Dansk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Visa logotyp</label>
                  <select value={form.showLogo ? "true" : "false"} onChange={e => setForm(f => ({ ...f, showLogo: e.target.value === "true" }))} className={cls}>
                    <option value="true">Ja</option>
                    <option value="false">Nej</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Swish QR-kod</label>
                  <select value={form.showSwishQr ? "true" : "false"} onChange={e => setForm(f => ({ ...f, showSwishQr: e.target.value === "true" }))} className={cls}>
                    <option value="false">Nej</option>
                    <option value="true">Ja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">F-skatt certifierad</label>
                  <select value={form.fScattCertified ? "true" : "false"} onChange={e => setForm(f => ({ ...f, fScattCertified: e.target.value === "true" }))} className={cls}>
                    <option value="true">Ja</option>
                    <option value="false">Nej</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sidfot</label>
                  <textarea value={form.footerText} onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))} rows={3} className={cls + " resize-none"} />
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
