"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type PaymentsForm = {
  bankName: string
  bankgiro: string
  plusgiro: string
  iban: string
  bic: string
  swish: string
  referenceFormat: "invoice_number" | "ocr" | "custom"
  referenceCustom: string
}

const EMPTY: PaymentsForm = {
  bankName: "", bankgiro: "", plusgiro: "", iban: "", bic: "",
  swish: "", referenceFormat: "invoice_number", referenceCustom: "",
}

export default function PaymentSettingsPage() {
  const [form, setForm] = useState<PaymentsForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/settings/payments")
      .then(r => r.json())
      .then(data => {
        setForm({
          bankName:        data.bankName        ?? "",
          bankgiro:        data.bankgiro        ?? "",
          plusgiro:        data.plusgiro        ?? "",
          iban:            data.iban            ?? "",
          bic:             data.bic             ?? "",
          swish:           data.swish           ?? "",
          referenceFormat: data.referenceFormat ?? "invoice_number",
          referenceCustom: data.referenceCustom ?? "",
        })
        setLoading(false)
      })
  }, [])

  function onInput(key: keyof PaymentsForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const res = await fetch("/api/settings/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankName:        form.bankName        || null,
        bankgiro:        form.bankgiro        || null,
        plusgiro:        form.plusgiro        || null,
        iban:            form.iban            || null,
        bic:             form.bic             || null,
        swish:           form.swish,
        referenceFormat: form.referenceFormat,
        referenceCustom: form.referenceCustom,
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
        <h1 className="text-2xl font-bold text-gray-900">Betalningsinställningar</h1>
        <p className="text-sm text-gray-500 mt-1">Dina betalningsuppgifter visas på fakturor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Svenska */}
        <Card>
          <CardHeader><CardTitle>Svenska betalsätt</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bankgiro">
                <input value={form.bankgiro} onChange={onInput("bankgiro")} className={cls} placeholder="123-4567" />
              </Field>
              <Field label="Plusgiro">
                <input value={form.plusgiro} onChange={onInput("plusgiro")} className={cls} placeholder="12345-6" />
              </Field>
            </div>
            <Field label="Swish">
              <input value={form.swish} onChange={onInput("swish")} className={cls} placeholder="07X XXX XX XX" />
            </Field>
          </CardContent>
        </Card>

        {/* Internationellt */}
        <Card>
          <CardHeader><CardTitle>Internationellt</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Bank">
              <input value={form.bankName} onChange={onInput("bankName")} className={cls} placeholder="Swedbank" />
            </Field>
            <Field label="IBAN">
              <input
                value={form.iban}
                onChange={onInput("iban")}
                className={cls + " font-mono"}
                placeholder="SE00 0000 0000 0000 0000 0000"
                maxLength={34}
              />
            </Field>
            <Field label="BIC / SWIFT">
              <input
                value={form.bic}
                onChange={onInput("bic")}
                className={cls + " font-mono"}
                placeholder="SWEDSESS"
                maxLength={11}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Referens */}
        <Card>
          <CardHeader><CardTitle>Betalningsreferens</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Referensformat på faktura">
              <select value={form.referenceFormat} onChange={onInput("referenceFormat")} className={cls}>
                <option value="invoice_number">Fakturanummer</option>
                <option value="ocr">OCR-nummer</option>
                <option value="custom">Fritext</option>
              </select>
            </Field>
            {form.referenceFormat === "custom" && (
              <Field label="Referenstext">
                <input
                  value={form.referenceCustom}
                  onChange={onInput("referenceCustom")}
                  className={cls}
                  placeholder="T.ex. Ange fakturanr vid betalning"
                />
              </Field>
            )}
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
