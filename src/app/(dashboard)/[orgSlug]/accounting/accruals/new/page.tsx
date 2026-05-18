"use client"

import { useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Suggested account defaults per type
const TYPE_DEFAULTS: Record<string, { mainAccount: string; accrualAccount: string }> = {
  prepaid_expense: { mainAccount: "5010", accrualAccount: "1710" },
  accrued_expense: { mainAccount: "5010", accrualAccount: "2990" },
  prepaid_revenue: { mainAccount: "3001", accrualAccount: "2830" },
  accrued_revenue: { mainAccount: "3001", accrualAccount: "1710" },
}

const TYPE_OPTIONS = [
  { value: "prepaid_expense", label: "Förutbetald kostnad",
    hint: "Kostnad betald i förväg — periodiseras framåt (t.ex. förskottsbetalad hyra)" },
  { value: "accrued_expense", label: "Upplupen kostnad",
    hint: "Kostnad uppkommen men ännu inte fakturerad (t.ex. upplupen lön)" },
  { value: "prepaid_revenue", label: "Förutbetald intäkt",
    hint: "Intäkt mottagen i förväg — periodiseras framåt (t.ex. abonnemang fakturerat ett år framåt)" },
  { value: "accrued_revenue", label: "Upplupen intäkt",
    hint: "Intäkt intjänad men ännu inte fakturerad (t.ex. upplupen ränteintäkt)" },
]

// Preview of period amounts computed client-side to give instant feedback
function previewAmounts(totalSEK: string, start: string, end: string): { period: string; amount: number }[] {
  const total = Math.round(parseFloat(totalSEK || "0") * 100)
  if (!total || !start || !end) return []
  const s = new Date(start), e = new Date(end)
  if (e < s) return []
  const n = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
  if (n <= 0) return []
  const base = Math.floor(total / n)
  const rem  = total - base * n
  const lines = []
  let year = s.getFullYear(), month = s.getMonth()
  for (let i = 0; i < n; i++) {
    lines.push({
      period: `${year}-${String(month + 1).padStart(2, "0")}`,
      amount: (i === n - 1 ? base + rem : base) / 100,
    })
    month++; if (month > 11) { month = 0; year++ }
  }
  return lines
}

export default function NewAccrualPage() {
  const params       = useParams<{ orgSlug: string }>()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const orgSlug      = params.orgSlug

  // Support pre-fill from wizard (sourceType, sourceId, totalSEK, description)
  const [form, setForm] = useState({
    accrualNumber:  "",
    type:           "prepaid_expense",
    description:    searchParams.get("description") ?? "",
    totalSEK:       searchParams.get("totalSEK") ?? "",
    startDate:      new Date().toISOString().slice(0, 10),
    endDate:        "",
    mainAccount:    TYPE_DEFAULTS["prepaid_expense"].mainAccount,
    accrualAccount: TYPE_DEFAULTS["prepaid_expense"].accrualAccount,
    sourceType:     searchParams.get("sourceType") ?? "",
    sourceId:       searchParams.get("sourceId") ?? "",
    notes:          "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set(k: string, v: string) {
    if (k === "type") {
      const defaults = TYPE_DEFAULTS[v] ?? TYPE_DEFAULTS["prepaid_expense"]
      setForm(f => ({ ...f, type: v, mainAccount: defaults.mainAccount, accrualAccount: defaults.accrualAccount }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

  const preview = previewAmounts(form.totalSEK, form.startDate, form.endDate)
  const selectedType = TYPE_OPTIONS.find(t => t.value === form.type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const body: Record<string, unknown> = {
      accrualNumber:  form.accrualNumber,
      type:           form.type,
      description:    form.description,
      totalAmount:    Math.round(parseFloat(form.totalSEK) * 100),
      startDate:      form.startDate,
      endDate:        form.endDate,
      mainAccount:    form.mainAccount,
      accrualAccount: form.accrualAccount,
      notes:          form.notes || null,
    }
    if (form.sourceType && form.sourceId) {
      body.sourceType = form.sourceType
      body.sourceId   = form.sourceId
    }

    const res = await fetch("/api/accounting/accruals", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })

    if (res.ok) {
      const { id } = await res.json()
      router.push(`/${orgSlug}/accounting/accruals/${id}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Kunde inte spara periodiseringen")
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href={`/${orgSlug}/accounting/accruals`} className="text-muted-foreground hover:text-foreground text-sm">
          ← Periodiseringar
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-foreground mb-6">Ny periodisering</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Typ och beskrivning</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Typ</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("type", t.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      form.type === t.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs mt-0.5 opacity-75">{t.hint}</p>
                  </button>
                ))}
              </div>
              {selectedType && (
                <p className="text-xs text-muted-foreground">{selectedType.hint}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nummer</label>
                <Input value={form.accrualNumber} onChange={e => set("accrualNumber", e.target.value)} placeholder="AC-2026-0001" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Totalt belopp (SEK)</label>
                <Input type="number" min="0.01" step="0.01" value={form.totalSEK} onChange={e => set("totalSEK", e.target.value)} placeholder="12000.00" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Beskrivning</label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="t.ex. Förskottshyra jan–dec 2026" required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Periodisering</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Startdatum</label>
                <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Slutdatum</label>
                <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} required />
              </div>
            </div>

            {preview.length > 0 && (
              <div className="rounded-lg border border-input bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fördelning ({preview.length} perioder)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm max-h-40 overflow-y-auto">
                  {preview.map(p => (
                    <div key={p.period} className="flex justify-between">
                      <span className="text-muted-foreground font-mono">{p.period}</span>
                      <span className="text-foreground">{p.amount.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Bokföringskonton (BAS)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Huvudkonto (resultat)</label>
                <Input value={form.mainAccount} onChange={e => set("mainAccount", e.target.value)} placeholder="5010" required />
                <p className="text-xs text-muted-foreground">Resultaträkningskonto (t.ex. 5010 Hyra)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Periodiseringskonto (balans)</label>
                <Input value={form.accrualAccount} onChange={e => set("accrualAccount", e.target.value)} placeholder="1710" required />
                <p className="text-xs text-muted-foreground">Balansposter (t.ex. 1710 Förutbet kostn, 2990 Upplupna)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving || preview.length === 0}>
            {saving ? "Sparar..." : "Skapa periodisering"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/accounting/accruals`)}>
            Avbryt
          </Button>
        </div>
      </form>
    </div>
  )
}
