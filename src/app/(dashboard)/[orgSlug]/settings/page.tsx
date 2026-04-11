"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type OrgSettings = {
  name: string
  orgNumber: string | null
  vatNumber: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  invoicePrefix: string | null
  invoiceNextNumber: number
  defaultPaymentTerms: number
  defaultVatRate: number
  currency: string
}

export default function SettingsPage() {
  const [form, setForm] = useState<OrgSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/settings/org")
      .then((r) => r.json())
      .then(setForm)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch("/api/settings/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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

  function set(key: keyof OrgSettings, value: string | number) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  if (!form) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inställningar</h1>
        <p className="text-sm text-gray-500 mt-1">Organisationens uppgifter och fakturainställningar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Företagsinformation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Företagsnamn *" required>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Org.nr">
                <input value={form.orgNumber ?? ""} onChange={(e) => set("orgNumber", e.target.value)} className={inputCls} placeholder="556xxx-xxxx" />
              </Field>
              <Field label="Momsnummer">
                <input value={form.vatNumber ?? ""} onChange={(e) => set("vatNumber", e.target.value)} className={inputCls} placeholder="SE556xxxxxxxx01" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="E-post">
                <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Telefon">
                <input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Webbplats">
              <input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} className={inputCls} placeholder="https://foretag.se" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Adress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Gatuadress">
              <input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Postnummer">
                <input value={form.postalCode ?? ""} onChange={(e) => set("postalCode", e.target.value)} className={inputCls} placeholder="123 45" />
              </Field>
              <div className="col-span-2">
                <Field label="Stad">
                  <input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
            <Field label="Land">
              <input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} className={inputCls} placeholder="Sverige" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fakturainställningar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fakturaprefix">
                <input value={form.invoicePrefix ?? ""} onChange={(e) => set("invoicePrefix", e.target.value)} className={inputCls} placeholder="INV-" />
              </Field>
              <Field label="Nästa fakturanummer">
                <input
                  type="number"
                  min={1}
                  value={form.invoiceNextNumber}
                  onChange={(e) => set("invoiceNextNumber", parseInt(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Betalningsvillkor (dagar)">
                <input
                  type="number"
                  min={0}
                  value={form.defaultPaymentTerms}
                  onChange={(e) => set("defaultPaymentTerms", parseInt(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Standard momssats (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.defaultVatRate}
                  onChange={(e) => set("defaultVatRate", parseInt(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Valuta">
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
                <option value="SEK">SEK — Svensk krona</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — US Dollar</option>
                <option value="NOK">NOK — Norsk krone</option>
                <option value="DKK">DKK — Dansk krone</option>
              </select>
            </Field>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Sparar…" : "Spara ändringar"}
          </button>
          {saved && <span className="text-sm text-green-600">Sparat!</span>}
        </div>
      </form>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
