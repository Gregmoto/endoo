"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link                     from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button }               from "@/components/ui/button"
import { CurrencySelect }       from "@/components/ui/CurrencySelect"

type Contact = { id: string; name: string; email: string | null; defaultCurrency: string | null }
type Product = { id: string; name: string; sku: string | null; unitPrice: number; taxRate: number; unit: string; description: string | null }

type LineItem = {
  id:           string
  productId:    string | null
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

function newLine(): LineItem {
  return { id: crypto.randomUUID(), productId: null, description: "", quantity: 1, unit: "st", unitPriceKr: 0, taxRate: 0.25, discountRate: 0 }
}

function lineTotal(l: LineItem) {
  const net = l.quantity * l.unitPriceKr * (1 - l.discountRate)
  return { net, tax: net * l.taxRate, total: net * (1 + l.taxRate) }
}

function fmt(n: number) {
  return n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fieldCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
const inputCls = "w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"

export default function NewQuotePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router      = useRouter()

  const [contacts, setContacts]   = useState<Contact[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [saving,   setSaving]     = useState(false)
  const [error,    setError]      = useState("")

  const [form, setForm] = useState({
    contactId:    "",
    contactName:  "",
    contactEmail: "",
    title:        "",
    currency:     "SEK",
    notes:        "",
    terms:        "",
    internalNote: "",
    validUntil:   "",
  })

  const [lines, setLines] = useState<LineItem[]>([newLine()])

  useEffect(() => {
    fetch("/api/contacts?limit=200").then(r => r.ok ? r.json() : { contacts: [] })
      .then(d => setContacts(d.contacts ?? []))
    fetch("/api/products?active=true&limit=200").then(r => r.ok ? r.json() : { products: [] })
      .then(d => setProducts(d.products ?? []))

    // Default valid until = 30 days
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setForm(f => ({ ...f, validUntil: d.toISOString().slice(0, 10) }))
  }, [])

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function onContactChange(id: string) {
    const c = contacts.find(c => c.id === id)
    setForm(f => ({
      ...f,
      contactId:    id,
      contactName:  c?.name  ?? f.contactName,
      contactEmail: c?.email ?? f.contactEmail ?? "",
      currency:     c?.defaultCurrency ?? f.currency,
    }))
  }

  function setLine(i: number, patch: Partial<LineItem>) {
    setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l))
  }

  function removeLine(i: number) {
    setLines(ls => ls.filter((_, j) => j !== i))
  }

  function pickProduct(lineIdx: number, productId: string) {
    const p = products.find(p => p.id === productId)
    if (!p) return
    setLine(lineIdx, {
      productId:   p.id,
      description: p.description ?? p.name,
      unitPriceKr: Number(p.unitPrice) / 100,
      taxRate:     Number(p.taxRate),
      unit:        p.unit,
    })
  }

  // Totals
  const subtotal = lines.reduce((s, l) => s + lineTotal(l).net, 0)
  const tax      = lines.reduce((s, l) => s + lineTotal(l).tax, 0)
  const total    = subtotal + tax

  async function save(sendNow = false) {
    if (!form.contactName.trim()) { setError("Ange ett kundnamn"); return }
    if (lines.some(l => !l.description.trim())) { setError("Alla rader behöver en beskrivning"); return }

    setSaving(true)
    setError("")

    const payload = {
      contactId:    form.contactId  || null,
      contactName:  form.contactName,
      contactEmail: form.contactEmail || null,
      title:        form.title       || null,
      currency:     form.currency,
      notes:        form.notes       || null,
      terms:        form.terms       || null,
      internalNote: form.internalNote || null,
      validUntil:   form.validUntil  || null,
      lineItems:    lines.map(l => ({
        description:  l.description,
        quantity:     l.quantity,
        unit:         l.unit,
        unitPriceKr:  l.unitPriceKr,
        taxRate:      l.taxRate,
        discountRate: l.discountRate,
      })),
    }

    const res  = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Något gick fel")
      setSaving(false)
      return
    }

    if (sendNow && form.contactEmail) {
      await fetch(`/api/quotes/${data.id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    }

    router.push(`/${orgSlug}/quotes/${data.id}`)
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${orgSlug}/quotes`} className="text-muted-foreground hover:text-muted-foreground text-sm">← Offerter</Link>
        <h1 className="text-xl font-bold text-foreground">Ny offert</h1>
      </div>

      <div className="space-y-4">
        {/* Recipient */}
        <Card>
          <CardHeader><CardTitle>Mottagare</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Kund</label>
              <select
                value={form.contactId}
                onChange={e => onContactChange(e.target.value)}
                className={fieldCls}
              >
                <option value="">Välj kund…</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Namn <span className="text-red-500">*</span></label>
                <input className={fieldCls} value={form.contactName} onChange={e => setField("contactName", e.target.value)} placeholder="Kundens namn" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">E-post</label>
                <input className={fieldCls} type="email" value={form.contactEmail} onChange={e => setField("contactEmail", e.target.value)} placeholder="kund@example.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle>Detaljer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Rubrik (valfri)</label>
              <input className={fieldCls} value={form.title} onChange={e => setField("title", e.target.value)} placeholder="t.ex. Webbutveckling Q3 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Valuta</label>
                <CurrencySelect value={form.currency} onChange={e => setField("currency", e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Giltig till</label>
                <input className={fieldCls} type="date" value={form.validUntil} onChange={e => setField("validUntil", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader><CardTitle>Innehåll</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Beskrivning</th>
                    <th className="pb-2 text-right font-medium w-16">Antal</th>
                    <th className="pb-2 text-left font-medium w-16">Enhet</th>
                    <th className="pb-2 text-right font-medium w-28">À-pris (kr)</th>
                    <th className="pb-2 text-right font-medium w-20">Moms</th>
                    <th className="pb-2 text-right font-medium w-28">Summa</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const { total: lt } = lineTotal(l)
                    return (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="py-2 pr-2">
                          <select
                            className={`${inputCls} mb-1 text-xs text-muted-foreground`}
                            value={l.productId ?? ""}
                            onChange={e => e.target.value ? pickProduct(i, e.target.value) : setLine(i, { productId: null })}
                          >
                            <option value="">Välj produkt…</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <input className={inputCls} value={l.description} onChange={e => setLine(i, { description: e.target.value })} placeholder="Beskrivning" />
                        </td>
                        <td className="py-2 pr-2">
                          <input className={`${inputCls} text-right`} type="number" min="0" step="0.01" value={l.quantity} onChange={e => setLine(i, { quantity: parseFloat(e.target.value) || 0 })} />
                        </td>
                        <td className="py-2 pr-2">
                          <input className={inputCls} value={l.unit} onChange={e => setLine(i, { unit: e.target.value })} />
                        </td>
                        <td className="py-2 pr-2">
                          <input className={`${inputCls} text-right`} type="number" min="0" step="0.01" value={l.unitPriceKr} onChange={e => setLine(i, { unitPriceKr: parseFloat(e.target.value) || 0 })} />
                        </td>
                        <td className="py-2 pr-2">
                          <select className={inputCls} value={l.taxRate} onChange={e => setLine(i, { taxRate: parseFloat(e.target.value) })}>
                            <option value={0}>0%</option>
                            <option value={0.06}>6%</option>
                            <option value={0.12}>12%</option>
                            <option value={0.25}>25%</option>
                          </select>
                        </td>
                        <td className="py-2 pr-2 text-right font-medium tabular-nums">{fmt(lt)}</td>
                        <td className="py-2">
                          {lines.length > 1 && (
                            <button onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={() => setLines(ls => [...ls, newLine()])} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              + Lägg till rad
            </button>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-56 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Netto</span><span className="tabular-nums">{fmt(subtotal)} {form.currency}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Moms</span><span className="tabular-nums">{fmt(tax)} {form.currency}</span></div>
                <div className="flex justify-between text-base font-bold text-foreground border-t border pt-1"><span>Totalt</span><span className="tabular-nums">{fmt(total)} {form.currency}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes / Terms */}
        <Card>
          <CardHeader><CardTitle>Meddelande och villkor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Meddelande till kund</label>
              <textarea className={`${fieldCls} min-h-[80px] resize-none`} value={form.notes} onChange={e => setField("notes", e.target.value)} placeholder="Visas i e-post och på PDF…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Villkor</label>
              <textarea className={`${fieldCls} min-h-[60px] resize-none`} value={form.terms} onChange={e => setField("terms", e.target.value)} placeholder="Betalningsvillkor, leveransvillkor…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Intern anteckning</label>
              <textarea className={`${fieldCls} min-h-[60px] resize-none`} value={form.internalNote} onChange={e => setField("internalNote", e.target.value)} placeholder="Syns bara internt…" />
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap pb-8">
          <Button onClick={() => save(false)} disabled={saving} variant="outline">
            {saving ? "Sparar…" : "Spara utkast"}
          </Button>
          <Button onClick={() => save(true)} disabled={saving || !form.contactEmail}>
            {saving ? "Skickar…" : "Spara och skicka"}
          </Button>
          {!form.contactEmail && (
            <p className="text-xs text-muted-foreground self-center">Fyll i e-post för att kunna skicka direkt</p>
          )}
        </div>
      </div>
    </div>
  )
}
