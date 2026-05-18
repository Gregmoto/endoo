"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type FormData = {
  name: string
  type: "product" | "service"
  isActive: boolean
  sku: string
  description: string
  unitPriceKr: string    // displayed as kronor, sent as öre
  taxRatePct: string     // displayed as %, stored as 0.25
  unit: string
  category: string
  currency: string
}

const EMPTY: FormData = {
  name: "", type: "service", isActive: true,
  sku: "", description: "",
  unitPriceKr: "", taxRatePct: "25",
  unit: "st", category: "", currency: "SEK",
}

export default function NewProductPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const unitPrice = Math.round(parseFloat(form.unitPriceKr || "0") * 100)
    const taxRate   = parseFloat(form.taxRatePct || "25") / 100

    const payload = {
      name:        form.name,
      type:        form.type,
      isActive:    form.isActive,
      sku:         form.sku         || null,
      description: form.description || null,
      unitPrice,
      taxRate,
      unit:        form.unit     || "st",
      category:    form.category || null,
      currency:    form.currency || "SEK",
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const product = await res.json()
      router.push(`/${params.orgSlug}/products/${product.id}`)
    } else {
      const d = await res.json()
      setError(d.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${params.orgSlug}/products`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Produkter
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-foreground">Ny artikel</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Grunduppgifter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Typ">
                <select value={form.type} onChange={set("type")} className={cls}>
                  <option value="service">Tjänst</option>
                  <option value="product">Produkt</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.isActive ? "true" : "false"}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "true" }))}
                  className={cls}
                >
                  <option value="true">Aktiv</option>
                  <option value="false">Inaktiv</option>
                </select>
              </Field>
            </div>
            <Field label="Namn *">
              <input required value={form.name} onChange={set("name")} className={cls} placeholder="Konsulttjänst per timme" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Artikelnummer (auto om tomt)">
                <input value={form.sku} onChange={set("sku")} className={cls} placeholder="P-0001" />
              </Field>
              <Field label="Kategori">
                <input value={form.category} onChange={set("category")} className={cls} placeholder="Konsulttjänster, Licenser…" />
              </Field>
            </div>
            <Field label="Beskrivning">
              <textarea
                value={form.description}
                onChange={set("description")}
                rows={3}
                className={`${cls} resize-none`}
                placeholder="Kortfattad beskrivning av artikeln…"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pris & moms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Field label="Pris exkl. moms (kr) *">
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.unitPriceKr}
                    onChange={set("unitPriceKr")}
                    className={cls}
                    placeholder="1000.00"
                  />
                </Field>
              </div>
              <Field label="Valuta">
                <input value={form.currency} onChange={set("currency")} maxLength={3} className={cls} placeholder="SEK" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Momssats (%)">
                <select value={form.taxRatePct} onChange={set("taxRatePct")} className={cls}>
                  <option value="25">25% (normalvaror)</option>
                  <option value="12">12% (livsmedel, hotell)</option>
                  <option value="6">6% (böcker, kollektivtrafik)</option>
                  <option value="0">0% (momsfri)</option>
                </select>
              </Field>
              <Field label="Enhet">
                <input value={form.unit} onChange={set("unit")} className={cls} placeholder="st, h, kg, m…" />
              </Field>
            </div>
            {form.unitPriceKr && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <span className="font-medium">Pris inkl. moms: </span>
                {((parseFloat(form.unitPriceKr || "0") * (1 + parseFloat(form.taxRatePct || "25") / 100))).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {form.currency}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>Skapa artikel</Button>
          <Link href={`/${params.orgSlug}/products`}>
            <Button type="button" variant="outline">Avbryt</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}
