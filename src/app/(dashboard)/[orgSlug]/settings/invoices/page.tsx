"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type InvoiceForm = {
  invoicePrefix: string
  invoiceSequenceStart: number
  defaultPaymentTermsDays: number
  defaultTaxRate: number
  defaultCurrency: string
  pricesIncludeTax: boolean
  roundingMode: "none" | "nearest" | "up" | "down"
  defaultNotes: string
  defaultFooter: string
}

const EMPTY: InvoiceForm = {
  invoicePrefix: "INV",
  invoiceSequenceStart: 1,
  defaultPaymentTermsDays: 30,
  defaultTaxRate: 0.25,
  defaultCurrency: "SEK",
  pricesIncludeTax: false,
  roundingMode: "none",
  defaultNotes: "",
  defaultFooter: "",
}

export default function InvoiceSettingsPage() {
  const [form, setForm] = useState<InvoiceForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/settings/invoices")
      .then(r => r.json())
      .then(data => {
        setForm({
          invoicePrefix:           data.invoicePrefix           ?? "INV",
          invoiceSequenceStart:    data.invoiceSequenceStart    ?? 1,
          defaultPaymentTermsDays: data.defaultPaymentTermsDays ?? 30,
          defaultTaxRate:          data.defaultTaxRate          ?? 0.25,
          defaultCurrency:         data.defaultCurrency         ?? "SEK",
          pricesIncludeTax:        data.pricesIncludeTax        ?? false,
          roundingMode:            data.roundingMode            ?? "none",
          defaultNotes:            data.defaultNotes            ?? "",
          defaultFooter:           data.defaultFooter           ?? "",
        })
        setLoading(false)
      })
  }, [])

  function setField<K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function onInput(key: keyof InvoiceForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setField(key, e.target.value as never)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const res = await fetch("/api/settings/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        invoiceSequenceStart:    Number(form.invoiceSequenceStart),
        defaultPaymentTermsDays: Number(form.defaultPaymentTermsDays),
        defaultTaxRate:          Number(form.defaultTaxRate),
      }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Fakturainställningar</h1>
        <p className="text-sm text-gray-500 mt-1">Standardvärden som används när du skapar fakturor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Numrering */}
        <Card>
          <CardHeader><CardTitle>Numrering</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prefix">
                <input value={form.invoicePrefix} onChange={onInput("invoicePrefix")} className={cls} placeholder="INV" />
              </Field>
              <Field label="Nästa fakturanummer">
                <input
                  type="number" min={1}
                  value={form.invoiceSequenceStart}
                  onChange={e => setField("invoiceSequenceStart", parseInt(e.target.value) || 1)}
                  className={cls}
                />
              </Field>
            </div>
            <p className="text-xs text-gray-400">
              Fakturor numreras som <span className="font-mono">{form.invoicePrefix}-{String(form.invoiceSequenceStart).padStart(4, "0")}</span>
            </p>
          </CardContent>
        </Card>

        {/* Standardvärden */}
        <Card>
          <CardHeader><CardTitle>Standardvärden</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Förfallodagar">
                <input
                  type="number" min={0} max={365}
                  value={form.defaultPaymentTermsDays}
                  onChange={e => setField("defaultPaymentTermsDays", parseInt(e.target.value) || 0)}
                  className={cls}
                />
              </Field>
              <Field label="Standard momssats">
                <select value={form.defaultTaxRate} onChange={e => setField("defaultTaxRate", parseFloat(e.target.value))} className={cls}>
                  <option value={0.25}>25%</option>
                  <option value={0.12}>12%</option>
                  <option value={0.06}>6%</option>
                  <option value={0}>0%</option>
                </select>
              </Field>
              <Field label="Valuta">
                <select value={form.defaultCurrency} onChange={onInput("defaultCurrency")} className={cls}>
                  <option value="SEK">SEK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="NOK">NOK</option>
                  <option value="DKK">DKK</option>
                  <option value="GBP">GBP</option>
                </select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Visning */}
        <Card>
          <CardHeader><CardTitle>Visning & avrundning</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Priser visas">
                <select
                  value={form.pricesIncludeTax ? "incl" : "excl"}
                  onChange={e => setField("pricesIncludeTax", e.target.value === "incl")}
                  className={cls}
                >
                  <option value="excl">Exklusive moms</option>
                  <option value="incl">Inklusive moms</option>
                </select>
              </Field>
              <Field label="Avrundning">
                <select value={form.roundingMode} onChange={onInput("roundingMode")} className={cls}>
                  <option value="none">Ingen avrundning</option>
                  <option value="nearest">Närmaste krona</option>
                  <option value="up">Avrunda uppåt</option>
                  <option value="down">Avrunda nedåt</option>
                </select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Texter */}
        <Card>
          <CardHeader><CardTitle>Standardtexter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Notering (visas på varje faktura)">
              <textarea
                value={form.defaultNotes}
                onChange={e => setField("defaultNotes", e.target.value)}
                rows={3}
                className={cls + " resize-none"}
                placeholder="T.ex. betalningsvillkor, bankuppgifter..."
              />
            </Field>
            <Field label="Sidfot">
              <textarea
                value={form.defaultFooter}
                onChange={e => setField("defaultFooter", e.target.value)}
                rows={2}
                className={cls + " resize-none"}
                placeholder="T.ex. Tack för din beställning!"
              />
            </Field>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>Spara ändringar</Button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Sparat</span>}
        </div>
      </form>
    </div>
  )
}

const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
