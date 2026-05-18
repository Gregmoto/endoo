"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Form = {
  reminderEnabled: boolean
  reminderDays:    string
  reminderFee:     number
}

export default function RemindersPage() {
  const [form, setForm]       = useState<Form>({ reminderEnabled: false, reminderDays: "7, 14", reminderFee: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState("")

  useEffect(() => {
    fetch("/api/settings/invoicing")
      .then(r => r.json())
      .then(data => {
        const s = (data.invoicingSettings ?? {}) as Record<string, unknown>
        const days = Array.isArray(s.reminderDays) ? (s.reminderDays as number[]).join(", ") : "7, 14"
        setForm({
          reminderEnabled: (s.reminderEnabled as boolean) ?? false,
          reminderDays:    days,
          reminderFee:     (s.reminderFee as number) ?? 0,
        })
        setLoading(false)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const days = form.reminderDays.split(",").map(d => parseInt(d.trim())).filter(n => !isNaN(n) && n > 0)
    const res = await fetch("/api/settings/invoicing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderEnabled: form.reminderEnabled, reminderDays: days, reminderFee: Number(form.reminderFee) }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await res.json(); setError(d.error ?? "Något gick fel") }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Påminnelseinställningar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Aktivera automatiska påminnelser">
            <select value={form.reminderEnabled ? "true" : "false"} onChange={e => setForm(f => ({ ...f, reminderEnabled: e.target.value === "true" }))} className={cls}>
              <option value="false">Nej — skicka manuellt</option>
              <option value="true">Ja — skicka automatiskt</option>
            </select>
          </Field>

          {form.reminderEnabled && (
            <>
              <Field label="Skicka påminnelse efter X dagar (kommaseparerat)">
                <input value={form.reminderDays} onChange={e => setForm(f => ({ ...f, reminderDays: e.target.value }))} className={cls} placeholder="7, 14, 30" />
                <p className="mt-1 text-xs text-muted-foreground">Antal dagar efter förfallodatum</p>
              </Field>
              <Field label="Påminnelseavgift (kr)">
                <input type="number" min={0} step={1} value={form.reminderFee}
                  onChange={e => setForm(f => ({ ...f, reminderFee: Number(e.target.value) }))} className={cls} />
              </Field>
            </>
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
