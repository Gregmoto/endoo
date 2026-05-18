"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Contact = { id: string; name: string; customerNumber: string | null }
type Product = { id: string; name: string; sku: string | null; unitPrice: number; taxRate: number; unit: string }

type LineItem = {
  id: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  unitPriceKr: number
  taxRate: number
  discountRate: number
}

function newLine(): LineItem {
  return { id: crypto.randomUUID(), productId: null, description: "", quantity: 1, unit: "st", unitPriceKr: 0, taxRate: 0.25, discountRate: 0 }
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

export default function NewContractPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [contacts, setContacts] = useState<Contact[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")

  const [form, setForm] = useState({
    name:             "",
    contactId:        "",
    frequency:        "monthly",
    startDate:        new Date().toISOString().slice(0, 10),
    endDate:          "",
    currency:         "SEK",
    paymentTermsDays: "30",
    autoSend:         false,
    reference:        "",
    notes:            "",
    internalNotes:    "",
  })

  const [lines, setLines] = useState<LineItem[]>([newLine()])

  useEffect(() => {
    fetch("/api/contacts?limit=200").then(r => r.ok ? r.json() : { contacts: [] }).then(d => setContacts(d.contacts ?? []))
    fetch("/api/products?active=true&limit=200").then(r => r.ok ? r.json() : { products: [] }).then(d => setProducts(d.products ?? []))
  }, [])

  const setF = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function setLine(lineId: string, k: keyof LineItem, v: string | number | null) {
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, [k]: v } : l))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const payload = {
      name:             form.name,
      contactId:        form.contactId || null,
      frequency:        form.frequency,
      startDate:        form.startDate,
      endDate:          form.endDate || null,
      currency:         form.currency,
      paymentTermsDays: parseInt(form.paymentTermsDays) || 30,
      autoSend:         form.autoSend,
      reference:        form.reference || null,
      notes:            form.notes     || null,
      internalNotes:    form.internalNotes || null,
      lines: lines.map((l, i) => ({
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

    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Fel"); setSaving(false); return }
    router.push(`/${orgSlug}/contracts/${data.id}`)
  }

  const totalMonthly = lines.reduce((s, l) => {
    const net = l.quantity * l.unitPriceKr * (1 - l.discountRate)
    return s + net * (1 + l.taxRate)
  }, 0)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${orgSlug}/contracts`} className="text-sm text-muted-foreground hover:text-foreground">← Avtal</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-foreground">Nytt avtal</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Avtalsuppgifter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Avtalsnamn *">
              <input required value={form.name} onChange={setF("name")} className={inputCls} placeholder="Månatlig support, Hosting…" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kund">
                <select value={form.contactId} onChange={setF("contactId")} className={inputCls}>
                  <option value="">Välj kund…</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.customerNumber ? ` (${c.customerNumber})` : ""}</option>
                  ))}
                </select>
              </Field>
              <Field label="Valuta">
                <select value={form.currency} onChange={setF("currency")} className={inputCls}>
                  {["SEK","EUR","USD","GBP","NOK","DKK"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Faktureringsschema</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Intervall">
                <select value={form.frequency} onChange={setF("frequency")} className={inputCls}>
                  <option value="monthly">Månadsvis</option>
                  <option value="quarterly">Kvartalsvis</option>
                  <option value="yearly">Årsvis</option>
                  <option value="weekly">Veckovis</option>
                  <option value="biweekly">Varannan vecka</option>
                </select>
              </Field>
              <Field label="Betalningsvillkor (dagar)">
                <input type="number" min={0} value={form.paymentTermsDays} onChange={setF("paymentTermsDays")} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Startdatum">
                <input type="date" required value={form.startDate} onChange={setF("startDate")} className={inputCls} />
              </Field>
              <Field label="Slutdatum (tom = tills vidare)">
                <input type="date" value={form.endDate} onChange={setF("endDate")} className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoSend}
                onChange={e => setForm(f => ({ ...f, autoSend: e.target.checked }))}
                className="rounded"
              />
              Skicka automatiskt vid generering
              <span className="text-xs text-muted-foreground ml-1">(kräver e-postkonfiguration)</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Avtalsrader</CardTitle>
              <button type="button" onClick={() => setLines(ls => [...ls, newLine()])}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                + Lägg till rad
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border bg-muted">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-5/12">Beskrivning</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">Antal</th>
                  <th className="px-2 py-2.5 text-left text-xs font-medium text-muted-foreground w-14">Enhet</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-28">À-pris (kr)</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">Moms</th>
                  <th className="px-2 py-2.5 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-t border-border/50 align-top">
                    <td className="px-3 py-2">
                      <input
                        list={`products-${line.id}`}
                        value={line.description}
                        onChange={e => {
                          setLine(line.id, "description", e.target.value)
                          // fill from product if exact match
                          const p = products.find(p => p.name === e.target.value || p.sku === e.target.value)
                          if (p) {
                            setLines(ls => ls.map(l => l.id !== line.id ? l : {
                              ...l, productId: p.id, description: p.name,
                              unit: p.unit, unitPriceKr: p.unitPrice / 100, taxRate: Number(p.taxRate),
                            }))
                          }
                        }}
                        required
                        placeholder="Artikel eller beskrivning…"
                        className="w-full text-sm border-0 focus:ring-0 bg-transparent"
                      />
                      <datalist id={`products-${line.id}`}>
                        {products.map(p => <option key={p.id} value={p.name} />)}
                      </datalist>
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0.001" step="any" value={line.quantity}
                        onChange={e => setLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full text-sm border-0 focus:ring-0 bg-transparent text-right" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={line.unit} onChange={e => setLine(line.id, "unit", e.target.value)}
                        className="w-full text-sm border-0 focus:ring-0 bg-transparent" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" step="0.01" value={line.unitPriceKr}
                        onChange={e => setLine(line.id, "unitPriceKr", parseFloat(e.target.value) || 0)}
                        className="w-full text-sm border-0 focus:ring-0 bg-transparent text-right" />
                    </td>
                    <td className="px-2 py-2">
                      <select value={line.taxRate} onChange={e => setLine(line.id, "taxRate", parseFloat(e.target.value))}
                        className="w-full text-sm border-0 bg-transparent text-right">
                        <option value={0.25}>25%</option>
                        <option value={0.12}>12%</option>
                        <option value={0.06}>6%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {lines.length > 1 && (
                        <button type="button" onClick={() => setLines(ls => ls.filter(l => l.id !== line.id))}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border text-right text-sm text-muted-foreground">
              Summa per period: <span className="font-bold text-foreground ml-2">
                {totalMonthly.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {form.currency}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Anteckningar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Meddelande till kund (syns på faktura)">
              <textarea value={form.notes} onChange={setF("notes")} rows={2}
                className="w-full px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </Field>
            <Field label="Internanteckning (syns ej på faktura)">
              <textarea value={form.internalNotes} onChange={setF("internalNotes")} rows={2}
                className="w-full px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </Field>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>Spara avtal</Button>
          <Link href={`/${orgSlug}/contracts`}>
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
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}
