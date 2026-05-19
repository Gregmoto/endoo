"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Form = {
  invoicePrefix:        string
  invoiceSequenceStart: number
  usePrefix:            boolean
}

export default function NumberingPage() {
  const [form, setForm]       = useState<Form>({ invoicePrefix: "F", invoiceSequenceStart: 1, usePrefix: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState("")

  useEffect(() => {
    fetch("/api/settings/invoicing")
      .then(r => r.json())
      .then(data => {
        const prefix = data.invoicePrefix ?? "F"
        setForm({
          invoicePrefix:        prefix,
          invoiceSequenceStart: data.invoiceSequenceStart ?? 1,
          usePrefix:            prefix !== "",
        })
        setLoading(false)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch("/api/settings/invoicing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoicePrefix:        form.usePrefix ? form.invoicePrefix : "",
        invoiceSequenceStart: Number(form.invoiceSequenceStart),
      }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await res.json(); setError(d.error ?? "Något gick fel") }
    setSaving(false)
  }

  if (loading) return <Spinner />

  const preview = form.usePrefix && form.invoicePrefix
    ? `${form.invoicePrefix}-${String(form.invoiceSequenceStart).padStart(4, "0")}`
    : String(form.invoiceSequenceStart).padStart(4, "0")

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Fakturanumrering</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Format">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={form.usePrefix} onChange={() => setForm(f => ({ ...f, usePrefix: true }))} />
                Med prefix (t.ex. F-0001)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!form.usePrefix} onChange={() => setForm(f => ({ ...f, usePrefix: false }))} />
                Utan prefix (t.ex. 0001)
              </label>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            {form.usePrefix && (
              <Field label="Prefix">
                <input value={form.invoicePrefix}
                  onChange={e => setForm(f => ({ ...f, invoicePrefix: e.target.value }))}
                  className={cls} placeholder="F" maxLength={10} />
              </Field>
            )}
            <Field label="Nästa fakturanummer">
              <input type="number" min={1}
                value={form.invoiceSequenceStart}
                onChange={e => setForm(f => ({ ...f, invoiceSequenceStart: parseInt(e.target.value) || 1 }))}
                className={cls} />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">
            Nästa faktura får numret <span className="font-mono font-medium text-foreground">{preview}</span>
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">{error}</p>}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>{saving ? "Sparar…" : "Spara ändringar"}</Button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Sparat</span>}
      </div>
    </form>
  )
}

const cls = "w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
