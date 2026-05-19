"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { generatePreviewSchedule } from "@/lib/invoicing/recurring/schedule"
import type { RecurringFrequency } from "@/lib/invoicing/recurring/schedule"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Contact = { id: string; name: string; customerNumber: string | null }

type LineItem = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

type WizardState = {
  // Step 1
  title:       string
  contactId:   string
  description: string
  // Step 2
  lines: LineItem[]
  // Step 3
  startDate:    string
  frequency:    RecurringFrequency
  customDays:   number
  endType:      "date" | "count" | "forever"
  endDate:      string
  maxInvoices:  number
  // Step 4
  paymentTermsDays: number
  ourReference:     string
  yourReference:    string
  autoSendMethod:   "email" | "print" | "manual"
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  monthly:    "Månadsvis",
  quarterly:  "Kvartalsvis",
  weekly:     "Veckovis",
  biweekly:   "Varannan vecka",
  halfyearly: "Halvår",
  yearly:     "Årsvis",
  custom:     "Anpassad",
}

const TAX_RATES = [
  { label: "25%", value: 0.25 },
  { label: "12%", value: 0.12 },
  { label: "6%",  value: 0.06 },
  { label: "0%",  value: 0.00 },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function calcLine(l: LineItem) {
  const netto   = l.quantity * l.unitPriceKr * (1 - l.discountRate)
  const tax     = netto * l.taxRate
  return { netto, tax, total: netto + tax }
}

function fmt(kr: number) {
  return kr.toLocaleString("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 })
}

const defaultLine: LineItem = {
  description: "", quantity: 1, unit: "st", unitPriceKr: 0, taxRate: 0.25, discountRate: 0,
}

const STEPS = ["Grundinfo", "Artiklar", "Schema", "Detaljer", "Förhandsgranska"]

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function NewRecurringPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [previewExpanded, setPreviewExpanded] = useState(false)

  const [form, setForm] = useState<WizardState>({
    title: "", contactId: "", description: "",
    lines: [{ ...defaultLine }],
    startDate: todayStr(), frequency: "monthly", customDays: 30,
    endType: "forever", endDate: "", maxInvoices: 12,
    paymentTermsDays: 30, ourReference: "", yourReference: "",
    autoSendMethod: "manual",
  })

  useEffect(() => {
    fetch("/api/contacts?limit=200")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.contacts) setContacts(d.contacts) })
      .catch(() => {})
  }, [])

  function setField<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setLine(i: number, partial: Partial<LineItem>) {
    setForm(f => {
      const lines = [...f.lines]
      lines[i] = { ...lines[i], ...partial }
      return { ...f, lines }
    })
  }

  function addLine() {
    setForm(f => ({ ...f, lines: [...f.lines, { ...defaultLine }] }))
  }

  function removeLine(i: number) {
    setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))
  }

  // Line totals
  const lineSums = form.lines.map(calcLine)
  const totalNetto = lineSums.reduce((s, l) => s + l.netto, 0)
  const totalTax   = lineSums.reduce((s, l) => s + l.tax,   0)
  const totalTotal = lineSums.reduce((s, l) => s + l.total, 0)

  // Preview schedule (client-side)
  const previewEntries = generatePreviewSchedule({
    startDate:   new Date(form.startDate),
    frequency:   form.frequency,
    customDays:  form.frequency === "custom" ? form.customDays : undefined,
    endDate:     form.endType === "date" && form.endDate ? new Date(form.endDate) : undefined,
    maxInvoices: form.endType === "count" ? form.maxInvoices : undefined,
    count:       previewExpanded ? 12 : 5,
  })

  async function save(activate: boolean) {
    setSaving(true)
    try {
      const body = {
        name:                form.title || "Nytt avtal",
        title:               form.title || null,
        description:         form.description || null,
        contactId:           form.contactId || null,
        frequency:           form.frequency,
        customDays:          form.frequency === "custom" ? form.customDays : null,
        startDate:           form.startDate,
        endDate:             form.endType === "date" && form.endDate ? form.endDate : null,
        maxInvoices:         form.endType === "count" ? form.maxInvoices : null,
        invoicesPerOccasion: 1,
        currency:            "SEK",
        paymentTermsDays:    form.paymentTermsDays,
        ourReference:        form.ourReference || null,
        yourReference:       form.yourReference || null,
        autoSendMethod:      form.autoSendMethod,
        notes:               null,
        lines:               form.lines.map((l, i) => ({
          description:  l.description,
          quantity:     l.quantity,
          unit:         l.unit,
          unitPriceKr:  l.unitPriceKr,
          taxRate:      l.taxRate,
          discountRate: l.discountRate,
          sortOrder:    i,
        })),
      }

      const res = await fetch("/api/recurring", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.message ?? "Kunde inte spara avtalet")
        return
      }

      const created = await res.json()

      if (activate) {
        const activateRes = await fetch(`/api/recurring/${created.id}/activate`, { method: "POST" })
        if (!activateRes.ok) {
          router.push(`/${orgSlug}/recurring/${created.id}`)
          return
        }
      }

      router.push(`/${orgSlug}/recurring/${created.id}`)
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Nytt avtal</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 text-xs">
        {STEPS.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className={`font-medium ${
                i === step
                  ? "text-foreground"
                  : i < step
                    ? "text-muted-foreground line-through"
                    : "text-muted-foreground"
              }`}
            >
              {i + 1} {s}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted-foreground">·</span>}
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">

          {/* ── Step 1: Grundinfo ── */}
          {step === 0 && (
            <>
              <h2 className="text-base font-semibold text-foreground">Grundinfo</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Titel</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setField("title", e.target.value)}
                    placeholder="T.ex. Månadsabonnemang webbtjänst"
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Kund</label>
                  <select
                    value={form.contactId}
                    onChange={e => setField("contactId", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Välj kund —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.customerNumber ? ` (${c.customerNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Beskrivning <span className="text-muted-foreground font-normal">(valfritt)</span></label>
                  <textarea
                    value={form.description}
                    onChange={e => setField("description", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Artiklar ── */}
          {step === 1 && (
            <>
              <h2 className="text-base font-semibold text-foreground">Artiklar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border">
                      <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Beskrivning</th>
                      <th className="pb-2 text-right text-xs font-semibold text-muted-foreground w-16">Antal</th>
                      <th className="pb-2 text-left text-xs font-semibold text-muted-foreground w-16">Enhet</th>
                      <th className="pb-2 text-right text-xs font-semibold text-muted-foreground w-24">À-pris (kr)</th>
                      <th className="pb-2 text-right text-xs font-semibold text-muted-foreground w-16">Rabatt%</th>
                      <th className="pb-2 text-right text-xs font-semibold text-muted-foreground w-16">Moms</th>
                      <th className="pb-2 text-right text-xs font-semibold text-muted-foreground w-24">Totalt</th>
                      <th className="pb-2 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((l, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={l.description}
                            onChange={e => setLine(i, { description: e.target.value })}
                            placeholder="Beskrivning"
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            value={l.quantity}
                            min={0}
                            step="0.01"
                            onChange={e => setLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={l.unit}
                            onChange={e => setLine(i, { unit: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            value={l.unitPriceKr}
                            min={0}
                            step="0.01"
                            onChange={e => setLine(i, { unitPriceKr: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            value={Math.round(l.discountRate * 100)}
                            min={0}
                            max={100}
                            onChange={e => setLine(i, { discountRate: (parseFloat(e.target.value) || 0) / 100 })}
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <select
                            value={l.taxRate}
                            onChange={e => setLine(i, { taxRate: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {TAX_RATES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2 text-right text-foreground font-medium">
                          {fmt(calcLine(l).total)}
                        </td>
                        <td className="py-1.5">
                          {form.lines.length > 1 && (
                            <button
                              onClick={() => removeLine(i)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addLine}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                + Lägg till rad
              </button>

              <div className="border-t border pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Netto</span><span>{fmt(totalNetto)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Moms</span><span>{fmt(totalTax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Totalt</span><span>{fmt(totalTotal)}</span>
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Schema ── */}
          {step === 2 && (
            <>
              <h2 className="text-base font-semibold text-foreground">Schema</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Första fakturadatum</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setField("startDate", e.target.value)}
                    className="px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Faktureringsfrekvens</label>
                  <select
                    value={form.frequency}
                    onChange={e => setField("frequency", e.target.value as RecurringFrequency)}
                    className="w-full max-w-xs px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {(Object.keys(FREQ_LABELS) as RecurringFrequency[]).map(k => (
                      <option key={k} value={k}>{FREQ_LABELS[k]}</option>
                    ))}
                  </select>
                </div>

                {form.frequency === "custom" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Var N:e dag</label>
                    <input
                      type="number"
                      value={form.customDays}
                      min={1}
                      onChange={e => setField("customDays", parseInt(e.target.value) || 1)}
                      className="w-24 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Slutdatum</label>
                  <div className="space-y-2">
                    {(["forever", "date", "count"] as const).map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="endType"
                          value={opt}
                          checked={form.endType === opt}
                          onChange={() => setField("endType", opt)}
                          className="text-foreground"
                        />
                        <span className="text-sm text-foreground">
                          {opt === "forever" && "Tills vidare"}
                          {opt === "date"    && "Datum"}
                          {opt === "count"   && "Antal fakturor"}
                        </span>
                        {opt === "date" && form.endType === "date" && (
                          <input
                            type="date"
                            value={form.endDate}
                            onChange={e => setField("endDate", e.target.value)}
                            className="px-2 py-1 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        )}
                        {opt === "count" && form.endType === "count" && (
                          <input
                            type="number"
                            value={form.maxInvoices}
                            min={1}
                            onChange={e => setField("maxInvoices", parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Step 4: Detaljer ── */}
          {step === 3 && (
            <>
              <h2 className="text-base font-semibold text-foreground">Detaljer</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Betalningsvillkor (dagar)</label>
                  <input
                    type="number"
                    value={form.paymentTermsDays}
                    min={0}
                    onChange={e => setField("paymentTermsDays", parseInt(e.target.value) || 0)}
                    className="w-32 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Vår referens</label>
                  <input
                    type="text"
                    value={form.ourReference}
                    onChange={e => setField("ourReference", e.target.value)}
                    className="w-full max-w-sm px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Er referens</label>
                  <input
                    type="text"
                    value={form.yourReference}
                    onChange={e => setField("yourReference", e.target.value)}
                    className="w-full max-w-sm px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Hur skickas fakturan?</label>
                  <div className="space-y-2">
                    {(["email", "manual", "print"] as const).map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="autoSendMethod"
                          value={opt}
                          checked={form.autoSendMethod === opt}
                          onChange={() => setField("autoSendMethod", opt)}
                        />
                        <span className="text-sm text-foreground">
                          {opt === "email"  && "Skickas automatiskt via e-post"}
                          {opt === "manual" && "Skapar utkast (skickas manuellt)"}
                          {opt === "print"  && "Skriv ut"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Step 5: Förhandsgranska ── */}
          {step === 4 && (
            <>
              <h2 className="text-base font-semibold text-foreground">Förhandsgranska</h2>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Titel</p>
                  <p className="text-foreground">{form.title || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Kund</p>
                  <p className="text-foreground">{contacts.find(c => c.id === form.contactId)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Frekvens</p>
                  <p className="text-foreground">{FREQ_LABELS[form.frequency]}{form.frequency === "custom" ? ` (var ${form.customDays} dagar)` : ""}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Start</p>
                  <p className="text-foreground">{form.startDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Slutar</p>
                  <p className="text-foreground">
                    {form.endType === "forever" && "Tills vidare"}
                    {form.endType === "date"    && (form.endDate || "—")}
                    {form.endType === "count"   && `Efter ${form.maxInvoices} fakturor`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Betalningsvillkor</p>
                  <p className="text-foreground">{form.paymentTermsDays} dagar</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Sändningsmetod</p>
                  <p className="text-foreground">
                    {form.autoSendMethod === "email"  && "E-post automatiskt"}
                    {form.autoSendMethod === "manual" && "Utkast (manuellt)"}
                    {form.autoSendMethod === "print"  && "Skriv ut"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Belopp per tillfälle</p>
                  <p className="text-foreground font-semibold">{fmt(totalTotal)}</p>
                </div>
              </div>

              {/* Preview schedule */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Kommande fakturor</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border">
                      <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Fakturadatum</th>
                      <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Fakturaperiod</th>
                      <th className="pb-2 text-right text-xs font-semibold text-muted-foreground">Fakturavärde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEntries.map((e, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="py-2 text-foreground">
                          {e.date.toLocaleDateString("sv-SE")}
                        </td>
                        <td className="py-2 text-muted-foreground">{e.periodLabel}</td>
                        <td className="py-2 text-right font-medium text-foreground">{fmt(totalTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!previewExpanded && (
                  <button
                    onClick={() => setPreviewExpanded(true)}
                    className="mt-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    + Visa fler
                  </button>
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border">
            <div>
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                  ← Tillbaka
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(s => s + 1)}>
                  Nästa →
                </Button>
              ) : (
                <>
                  <Button variant="outline" disabled={saving} onClick={() => save(false)}>
                    {saving ? "Sparar…" : "Spara som utkast"}
                  </Button>
                  <Button disabled={saving} onClick={() => save(true)}>
                    {saving ? "Aktiverar…" : "✓ Aktivera"}
                  </Button>
                </>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
