"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Form = {
  defaultCurrency:         string
  defaultTaxRate:          number
  defaultPaymentTermsDays: number
  priceIncludesVat:        boolean
  roundingMode:            string
  invoiceLang:             string
}

const EMPTY: Form = {
  defaultCurrency:         "SEK",
  defaultTaxRate:          25,
  defaultPaymentTermsDays: 30,
  priceIncludesVat:        false,
  roundingMode:            "auto",
  invoiceLang:             "sv",
}

export default function GeneralInvoicingPage() {
  const [form, setForm]     = useState<Form>(EMPTY)
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
          defaultCurrency:         data.defaultCurrency         ?? "SEK",
          defaultTaxRate:          data.defaultTaxRate          ?? 25,
          defaultPaymentTermsDays: data.defaultPaymentTermsDays ?? 30,
          priceIncludesVat:        (s.priceIncludesVat as boolean) ?? false,
          roundingMode:            (s.roundingMode as string)   ?? "auto",
          invoiceLang:             (s.invoiceLang as string)    ?? "sv",
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
        defaultCurrency:         form.defaultCurrency,
        defaultTaxRate:          Number(form.defaultTaxRate),
        defaultPaymentTermsDays: Number(form.defaultPaymentTermsDays),
        priceIncludesVat:        form.priceIncludesVat,
        roundingMode:            form.roundingMode,
        invoiceLang:             form.invoiceLang,
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
        <CardHeader><CardTitle>Standardvärden</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Standardvaluta">
              <select value={form.defaultCurrency} onChange={e => setForm(f => ({ ...f, defaultCurrency: e.target.value }))} className={cls}>
                {["SEK","EUR","USD","GBP","NOK","DKK"].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Standard momssats">
              <select value={form.defaultTaxRate} onChange={e => setForm(f => ({ ...f, defaultTaxRate: Number(e.target.value) }))} className={cls}>
                <option value={25}>25%</option>
                <option value={12}>12%</option>
                <option value={6}>6%</option>
                <option value={0}>0%</option>
              </select>
            </Field>
            <Field label="Standard betalningsdagar">
              <input type="number" min={0} max={365} value={form.defaultPaymentTermsDays}
                onChange={e => setForm(f => ({ ...f, defaultPaymentTermsDays: parseInt(e.target.value) || 0 }))}
                className={cls} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Priser & avrundning</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priser på faktura">
              <select value={form.priceIncludesVat ? "incl" : "excl"} onChange={e => setForm(f => ({ ...f, priceIncludesVat: e.target.value === "incl" }))} className={cls}>
                <option value="excl">Exklusive moms</option>
                <option value="incl">Inklusive moms</option>
              </select>
            </Field>
            <Field label="Öresavrundning">
              <select value={form.roundingMode} onChange={e => setForm(f => ({ ...f, roundingMode: e.target.value }))} className={cls}>
                <option value="auto">Automatisk (banker&apos;s rounding)</option>
                <option value="manual">Manuell</option>
                <option value="off">Ingen avrundning</option>
              </select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Språk</CardTitle></CardHeader>
        <CardContent>
          <Field label="Fakturans språk">
            <select value={form.invoiceLang} onChange={e => setForm(f => ({ ...f, invoiceLang: e.target.value }))} className={cls}>
              <option value="sv">Svenska</option>
              <option value="en">English</option>
              <option value="no">Norsk</option>
              <option value="da">Dansk</option>
            </select>
          </Field>
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
