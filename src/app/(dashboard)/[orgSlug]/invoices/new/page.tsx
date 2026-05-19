"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CurrencySelect } from "@/components/ui/CurrencySelect"
import { InvoiceFormLineItems, FLineItem, newFLine } from "@/components/invoice/InvoiceFormLineItems"

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = { id: string; name: string; customerNumber: string | null; defaultPaymentTermsDays: number | null; defaultCurrency: string | null }

const fieldCls = "w-full px-3 py-2.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const params       = useParams<{ orgSlug: string }>()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const orgSlug      = params.orgSlug

  const [contacts, setContacts] = useState<Contact[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")

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

  const [lines, setLines] = useState<FLineItem[]>([newFLine()])

  // Load contacts
  useEffect(() => {
    fetch("/api/contacts?limit=200").then(r => r.ok ? r.json() : { contacts: [] })
      .then(d => setContacts(d.contacts ?? []))

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
      lineItems: lines.map((l, i) => {
        const priceOre        = Math.round((parseFloat(l.unitPriceStr) || 0) * 100)
        const orderedQty      = parseFloat(l.orderedQty) || 0
        const deliveredQty    = l.deliveredQty ? parseFloat(l.deliveredQty) || null : null
        const discVal         = parseFloat(l.discountValue) || 0
        const discountRate    = l.discountMode === "%"
          ? discVal / 100
          : (priceOre > 0 && orderedQty > 0 ? Math.min(1, Math.round(discVal * 100) / (orderedQty * priceOre)) : 0)
        return {
          description:       l.description,
          quantity:          orderedQty,
          orderedQuantity:   orderedQty,
          deliveredQuantity: deliveredQty,
          unit:              l.unit,
          unitPriceOre:      priceOre,
          taxRate:           l.taxRate,
          discountRate,
          productId:         l.productId,
          articleNumber:     l.sku || null,
          accountNumber:     l.accountNumber || null,
          vatType:           l.vatType,
          warehouseLocation: l.warehouseLocation || null,
          purchasePrice:     l.purchasePriceOre || null,
          sortOrder:         i,
        }
      }),
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
              <CurrencySelect value={form.currency} onChange={setField("currency")} className={fieldCls} />
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
          <CardHeader><CardTitle>Fakturarader</CardTitle></CardHeader>
          <CardContent className="p-0">
            <InvoiceFormLineItems lines={lines} onChange={setLines} currency={form.currency} />
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

        {error && <p className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">{error}</p>}

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
