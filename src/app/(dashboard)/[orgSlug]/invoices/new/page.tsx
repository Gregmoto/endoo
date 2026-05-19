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

const inputCls = "w-full px-2 py-1.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const fieldCls = "w-full px-3 py-2.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const params       = useParams<{ orgSlug: string }>()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const orgSlug      = params.orgSlug

  const [contacts, setContacts]           = useState<Contact[]>([])
  const [products, setProducts]           = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState("")

  const [form, setForm] = useState({
    contactId:   searchParams.get("contactId") ?? "",
    issueDate:   new Date().toISOString().slice(0, 10),
    dueDate:     "",
    currency:    "SEK",
    reference:   "",
    poNumber:    "",
    notes:       "",
    footerText:  "",
    type:        (searchParams.get("type") ?? "invoice") as "invoice" | "proforma",
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

  function fmt(v: number) {
    return v.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const payload = {
      ...form,
      contactId:  form.contactId  || null,
      reference:  form.reference  || null,
      poNumber:   form.poNumber   || null,
      notes:      form.notes      || null,
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
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/${orgSlug}/invoices`} className="text-sm text-muted-foreground hover:text-foreground flex-shrink-0">← Fakturor</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {form.type === "proforma" ? "Ny proformafaktura" : "Ny faktura"}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm flex-shrink-0">
          <span className="text-muted-foreground">Typ:</span>
          <select
            value={form.type}
            onChange={setField("type")}
            className="px-2 py-1.5 border border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="invoice">Faktura</option>
            <option value="proforma">Proformafaktura</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Header fields */}
        <Card>
          <CardHeader><CardTitle>Mottagare & datum</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kund">
              <select value={form.contactId} onChange={setField("contactId")} className={fieldCls}>
                <option value="">Välj kund…</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.customerNumber ? ` (${c.customerNumber})` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Valuta">
              <select value={form.currency} onChange={setField("currency")} className={fieldCls}>
                {["SEK","EUR","USD","GBP","NOK","DKK"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Fakturadatum">
              <input type="date" required value={form.issueDate} onChange={setField("issueDate")} className={fieldCls} />
            </Field>
            <Field label="Förfallodatum">
              <input type="date" required value={form.dueDate} onChange={setField("dueDate")} className={fieldCls} />
            </Field>
            <Field label="Er referens / PO-nummer">
              <input value={form.poNumber} onChange={setField("poNumber")} className={fieldCls} placeholder="Inköpsorder, projektnamn…" />
            </Field>
            <Field label="Vår referens">
              <input value={form.reference} onChange={setField("reference")} className={fieldCls} placeholder="Säljare, projekt-ID…" />
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
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium min-h-[44px] px-2"
              >
                + Lägg till rad
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">

            {/* ── Desktop table (hidden on mobile) ──────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border bg-muted">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-5/12">Beskrivning</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">Antal</th>
                    <th className="px-2 py-2.5 text-left text-xs font-medium text-muted-foreground w-14">Enhet</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-28">À-pris (kr)</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">Rabatt</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">Moms</th>
                    <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-28">Summa</th>
                    <th className="px-2 py-2.5 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const t = lineTotal(line)
                    const query = productSearch[i] ?? ""
                    const suggestions = filteredProducts(query)
                    return (
                      <tr key={line.id} className="border-t border-border/50 align-top">
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
                            <div className="absolute left-3 top-full z-20 w-72 bg-card border border rounded-lg shadow-lg">
                              {suggestions.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => fillFromProduct(line.id, p)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border/50 last:border-0"
                                >
                                  <span className="font-medium">{p.name}</span>
                                  {p.sku && <span className="text-muted-foreground ml-2 text-xs">{p.sku}</span>}
                                  <span className="float-right text-muted-foreground text-xs">
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
                          {line.discountRate > 0 && <span className="text-muted-foreground text-xs float-right">%</span>}
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
                          {fmt(t.total)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setLines(ls => ls.filter(l => l.id !== line.id))}
                              className="text-muted-foreground hover:text-destructive text-lg leading-none"
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

            {/* ── Mobile line item cards (hidden on desktop) ────────────────── */}
            <div className="sm:hidden divide-y divide-border">
              {lines.map((line, i) => {
                const t = lineTotal(line)
                const query = productSearch[i] ?? ""
                const suggestions = filteredProducts(query)
                return (
                  <div key={line.id} className="p-4 space-y-3">
                    {/* Row header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rad {i + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines(ls => ls.filter(l => l.id !== line.id))}
                          className="text-xs text-red-400 hover:text-red-600 font-medium min-h-[44px] px-2"
                        >
                          Ta bort
                        </button>
                      )}
                    </div>

                    {/* Description with product search */}
                    <div className="relative">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Beskrivning</label>
                      <input
                        value={line.description}
                        onChange={e => {
                          setLine(line.id, "description", e.target.value)
                          setProductSearch(s => ({ ...s, [i]: e.target.value }))
                        }}
                        placeholder="Artikel eller beskrivning…"
                        required
                        className={inputCls}
                      />
                      {suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border rounded-lg shadow-lg">
                          {suggestions.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => fillFromProduct(line.id, p)}
                              className="w-full px-3 py-3 text-left text-sm hover:bg-muted border-b border-border/50 last:border-0 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-medium">{p.name}</span>
                                {p.sku && <span className="text-muted-foreground ml-2 text-xs">{p.sku}</span>}
                              </div>
                              <span className="text-muted-foreground text-xs tabular-nums">
                                {(p.unitPrice / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantity + unit + price */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Antal</label>
                        <input
                          type="number" min="0.001" step="any" value={line.quantity}
                          onChange={e => setLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Enhet</label>
                        <input
                          value={line.unit}
                          onChange={e => setLine(line.id, "unit", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">À-pris (kr)</label>
                        <input
                          type="number" min="0" step="0.01" value={line.unitPriceKr}
                          onChange={e => setLine(line.id, "unitPriceKr", parseFloat(e.target.value) || 0)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Discount + tax */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Rabatt (%)</label>
                        <input
                          type="number" min="0" max="100" step="1"
                          value={Math.round(line.discountRate * 100)}
                          onChange={e => setLine(line.id, "discountRate", (parseFloat(e.target.value) || 0) / 100)}
                          className={inputCls}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Moms</label>
                        <select
                          value={line.taxRate}
                          onChange={e => setLine(line.id, "taxRate", parseFloat(e.target.value))}
                          className={inputCls}
                        >
                          <option value={0.25}>25%</option>
                          <option value={0.12}>12%</option>
                          <option value={0.06}>6%</option>
                          <option value={0}>0%</option>
                        </select>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="flex items-center justify-between pt-1 border-t border">
                      <span className="text-xs text-muted-foreground">Radtotal (inkl. moms)</span>
                      <span className="font-semibold tabular-nums text-foreground">{fmt(t.total)} {form.currency}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totals */}
            <div className="px-4 py-4 border-t border text-sm space-y-1.5 flex flex-col items-end">
              <div className="text-muted-foreground tabular-nums">
                Netto: {fmt(totals.net)} {form.currency}
              </div>
              <div className="text-muted-foreground tabular-nums">
                Moms: {fmt(totals.tax)} {form.currency}
              </div>
              <div className="font-bold text-foreground text-base tabular-nums border-t border pt-1.5 mt-1">
                Totalt: {fmt(totals.total)} {form.currency}
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
                className="w-full px-3 py-2.5 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Tack för ert förtroende…"
              />
            </Field>
            <Field label="Fotnot (betalningsinformation, bankuppgifter etc.)">
              <textarea
                value={form.footerText}
                onChange={setField("footerText")}
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Bankgiro: 123-4567 · Swish: 070-000 00 00"
              />
            </Field>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

        <div className="flex items-center gap-3 pb-4">
          <Button type="submit" loading={saving} className="min-h-[44px]">
            {form.type === "proforma" ? "Spara proforma" : "Spara faktura"}
          </Button>
          <Link href={`/${orgSlug}/invoices`}>
            <Button type="button" variant="outline" className="min-h-[44px]">Avbryt</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}
