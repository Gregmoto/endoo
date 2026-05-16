"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = { id: string; name: string; customerNumber: string | null; defaultPaymentTermsDays: number | null; defaultCurrency: string | null }
type Product = { id: string; name: string; sku: string | null; unitPrice: number; taxRate: number; unit: string; description: string | null }

type LineItem = {
  id:           string          // client-side key
  productId:    string | null
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number          // display value in kr
  taxRate:      number          // 0.25 etc.
  discountRate: number          // 0–1
}

function newLine(): LineItem {
  return { id: crypto.randomUUID(), productId: null, description: "", quantity: 1, unit: "st", unitPriceKr: 0, taxRate: 0.25, discountRate: 0 }
}

function lineTotal(l: LineItem) {
  const net = l.quantity * l.unitPriceKr * (1 - l.discountRate)
  return { net, tax: net * l.taxRate, total: net * (1 + l.taxRate) }
}

const inputCls = "w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const params       = useParams<{ orgSlug: string }>()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const orgSlug      = params.orgSlug

  const [contacts, setContacts]         = useState<Contact[]>([])
  const [products, setProducts]         = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState("")

  const [form, setForm] = useState({
    contactId:   searchParams.get("contactId") ?? "",
    issueDate:   new Date().toISOString().slice(0, 10),
    dueDate:     "",
    currency:    "SEK",
    reference:   "",
    poNumber:    "",
    notes:       "",
    footerText:  "",
  })

  const [lines, setLines] = useState<LineItem[]>([newLine()])

  // Load contacts + products
  useEffect(() => {
    fetch("/api/contacts?limit=200").then(r => r.ok ? r.json() : { contacts: [] })
      .then(d => setContacts(d.contacts ?? []))
    fetch("/api/products?active=true&limit=200").then(r => r.ok ? r.json() : { products: [] })
      .then(d => setProducts(d.products ?? []))

    // Default due date = 30 days
    const due = new Date()
    due.setDate(due.getDate() + 30)
    setForm(f => ({ ...f, dueDate: due.toISOString().slice(0, 10) }))
  }, [])

  // When contact changes, update currency + payment terms
  useEffect(() => {
    if (!form.contactId) return
    const c = contacts.find(c => c.id === form.contactId)
    if (!c) return
    setForm(f => ({
      ...f,
      currency: c.defaultCurrency ?? f.currency,
    }))
    if (c.defaultPaymentTermsDays != null) {
      const due = new Date(form.issueDate)
      due.setDate(due.getDate() + c.defaultPaymentTermsDays)
      setForm(f => ({ ...f, dueDate: due.toISOString().slice(0, 10) }))
    }
  }, [form.contactId]) // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function setLine(lineId: string, k: keyof LineItem, v: string | number | null) {
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, [k]: v } : l))
  }

  function fillFromProduct(lineId: string, product: Product) {
    setLines(ls => ls.map(l => l.id !== lineId ? l : {
      ...l,
      productId:   product.id,
      description: product.name,
      unit:        product.unit,
      unitPriceKr: product.unitPrice / 100,
      taxRate:     Number(product.taxRate),
    }))
    setProductSearch(s => ({ ...s, [lines.findIndex(l => l.id === lineId)]: "" }))
  }

  // Filtered product dropdown
  const filteredProducts = useCallback((query: string) =>
    query.length < 1 ? [] : products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8),
  [products])

  const totals = lines.reduce((acc, l) => {
    const t = lineTotal(l)
    return { net: acc.net + t.net, tax: acc.tax + t.tax, total: acc.total + t.total }
  }, { net: 0, tax: 0, total: 0 })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const payload = {
      ...form,
      contactId: form.contactId || null,
      reference: form.reference || null,
      poNumber:  form.poNumber  || null,
      notes:     form.notes     || null,
      footerText: form.footerText || null,
      lineItems: lines.map((l, i) => ({
        description:  l.description,
        quantity:     l.quantity,
        unit:         l.unit,
        unitPriceKr:  l.unitPriceKr,
        taxRate:      l.taxRate,
        discountRate: l.discountRate,
        productId:    l.productId,
        sortOrder:    i,
      })),
    }

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Fel"); setSaving(false); return }
    router.push(`/${orgSlug}/invoices/${data.id}`)
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${orgSlug}/invoices`} className="text-sm text-gray-500 hover:text-gray-700">← Fakturor</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Ny faktura</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <Card>
          <CardHeader><CardTitle>Mottagare & datum</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Kund">
              <select value={form.contactId} onChange={setField("contactId")} className={inputCls}>
                <option value="">Välj kund…</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.customerNumber ? ` (${c.customerNumber})` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Valuta">
              <select value={form.currency} onChange={setField("currency")} className={inputCls}>
                {["SEK","EUR","USD","GBP","NOK","DKK"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Fakturadatum">
              <input type="date" required value={form.issueDate} onChange={setField("issueDate")} className={inputCls} />
            </Field>
            <Field label="Förfallodatum">
              <input type="date" required value={form.dueDate} onChange={setField("dueDate")} className={inputCls} />
            </Field>
            <Field label="Er referens / PO-nummer">
              <input value={form.poNumber} onChange={setField("poNumber")} className={inputCls} placeholder="Inköpsorder, projektnamn…" />
            </Field>
            <Field label="Vår referens">
              <input value={form.reference} onChange={setField("reference")} className={inputCls} placeholder="Säljare, projekt-ID…" />
            </Field>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fakturarader</CardTitle>
              <button
                type="button"
                onClick={() => setLines(ls => [...ls, newLine()])}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Lägg till rad
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-5/12">Beskrivning</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500 w-16">Antal</th>
                    <th className="px-2 py-2.5 text-left text-xs font-medium text-gray-500 w-14">Enhet</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500 w-28">À-pris (kr)</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500 w-16">Rabatt</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500 w-16">Moms</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500 w-28">Summa</th>
                    <th className="px-2 py-2.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const t = lineTotal(line)
                    const query = productSearch[i] ?? ""
                    const suggestions = filteredProducts(query)
                    return (
                      <tr key={line.id} className="border-t border-gray-50 align-top">
                        {/* Description + product search */}
                        <td className="px-3 py-2 relative">
                          <input
                            value={line.description}
                            onChange={e => {
                              setLine(line.id, "description", e.target.value)
                              setProductSearch(s => ({ ...s, [i]: e.target.value }))
                            }}
                            placeholder="Artikel eller beskrivning…"
                            required
                            className="w-full text-sm border-0 focus:ring-0 bg-transparent"
                          />
                          {suggestions.length > 0 && (
                            <div className="absolute left-3 top-full z-20 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
                              {suggestions.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => fillFromProduct(line.id, p)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                >
                                  <span className="font-medium">{p.name}</span>
                                  {p.sku && <span className="text-gray-400 ml-2 text-xs">{p.sku}</span>}
                                  <span className="float-right text-gray-500 text-xs">
                                    {(p.unitPrice / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number" min="0.001" step="any" value={line.quantity}
                            onChange={e => setLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                            className="w-full text-sm border-0 focus:ring-0 bg-transparent text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={line.unit}
                            onChange={e => setLine(line.id, "unit", e.target.value)}
                            className="w-full text-sm border-0 focus:ring-0 bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number" min="0" step="0.01" value={line.unitPriceKr}
                            onChange={e => setLine(line.id, "unitPriceKr", parseFloat(e.target.value) || 0)}
                            className="w-full text-sm border-0 focus:ring-0 bg-transparent text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number" min="0" max="100" step="1"
                            value={Math.round(line.discountRate * 100)}
                            onChange={e => setLine(line.id, "discountRate", (parseFloat(e.target.value) || 0) / 100)}
                            className="w-full text-sm border-0 focus:ring-0 bg-transparent text-right"
                            placeholder="0"
                          />
                          {line.discountRate > 0 && <span className="text-gray-400 text-xs float-right">%</span>}
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={line.taxRate}
                            onChange={e => setLine(line.id, "taxRate", parseFloat(e.target.value))}
                            className="w-full text-sm border-0 bg-transparent text-right"
                          >
                            <option value={0.25}>25%</option>
                            <option value={0.12}>12%</option>
                            <option value={0.06}>6%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium">
                          {t.total.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setLines(ls => ls.filter(l => l.id !== line.id))}
                              className="text-gray-300 hover:text-red-400 text-lg leading-none"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-4 py-4 border-t border-gray-100 text-sm space-y-1.5 flex flex-col items-end">
              <div className="text-gray-500 tabular-nums">
                Netto: {totals.net.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {form.currency}
              </div>
              <div className="text-gray-500 tabular-nums">
                Moms: {totals.tax.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {form.currency}
              </div>
              <div className="font-bold text-gray-900 text-base tabular-nums border-t border-gray-200 pt-1.5 mt-1">
                Totalt: {totals.total.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {form.currency}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle>Meddelande & fotnoter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Meddelande till mottagaren">
              <textarea
                value={form.notes}
                onChange={setField("notes")}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Tack för ert förtroende…"
              />
            </Field>
            <Field label="Fotnot (betalningsinformation, bankuppgifter etc.)">
              <textarea
                value={form.footerText}
                onChange={setField("footerText")}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Bankgiro: 123-4567 · Swish: 070-000 00 00"
              />
            </Field>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>Spara faktura</Button>
          <Link href={`/${orgSlug}/invoices`}>
            <Button type="button" variant="outline">Avbryt</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
