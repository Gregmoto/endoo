"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Form = {
  interestRate:      number
  interestEnabled:   boolean
  interestGraceDays: number
}

export default function InterestPage() {
  const [form, setForm]       = useState<Form>({ interestRate: 8, interestEnabled: false, interestGraceDays: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState("")

  useEffect(() => {
    fetch("/api/settings/invoicing")
      .then(r => r.json())
      .then(data => {
        const s = (data.invoicingSettings ?? {}) as Record<string, unknown>
        setForm({
          interestRate:      (s.interestRate as number)      ?? 8,
          interestEnabled:   (s.interestEnabled as boolean)  ?? false,
          interestGraceDays: (s.interestGraceDays as number) ?? 0,
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
        interestRate:      Number(form.interestRate),
        interestEnabled:   form.interestEnabled,
        interestGraceDays: Number(form.interestGraceDays),
      }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await res.json(); setError(d.error ?? "Något gick fel") }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Dröjsmålsränta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Riksbankens referensränta + 8 procentenheter gäller per lag (räntelagen 6 §).
            Anpassa om din bransch har avtalade villkor.
          </p>
          <Field label="Aktivera dröjsmålsränta">
            <select value={form.interestEnabled ? "true" : "false"} onChange={e => setForm(f => ({ ...f, interestEnabled: e.target.value === "true" }))} className={cls}>
              <option value="false">Nej</option>
              <option value="true">Ja</option>
            </select>
          </Field>

          {form.interestEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Räntesats (% per år)">
                <input type="number" min={0} max={100} step={0.5} value={form.interestRate}
                  onChange={e => setForm(f => ({ ...f, interestRate: parseFloat(e.target.value) || 0 }))} className={cls} />
              </Field>
              <Field label="Karenstid (dagar)">
                <input type="number" min={0} max={60} value={form.interestGraceDays}
                  onChange={e => setForm(f => ({ ...f, interestGraceDays: parseInt(e.target.value) || 0 }))} className={cls} />
                <p className="mt-1 text-xs text-muted-foreground">Dagar efter förfallodatum innan ränta börjar löpa</p>
              </Field>
            </div>
          )}
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
