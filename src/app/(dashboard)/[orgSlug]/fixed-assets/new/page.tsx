"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const METHOD_OPTIONS = [
  { value: "linear",            label: "Linjär (rak avskrivning)" },
  { value: "declining_balance", label: "Degressiv (fallande saldo)" },
  { value: "tax_book",          label: "Räkenskapsenlig (30% fallande saldo)" },
]

const CATEGORY_OPTIONS = [
  "Datorer och IT-utrustning",
  "Maskiner och produktionsutrustning",
  "Inventarier och kontorsutrustning",
  "Fordon",
  "Byggnader",
  "Mark",
  "Immaterialrätter",
  "Övriga anläggningstillgångar",
]

export default function NewFixedAssetPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [form, setForm] = useState({
    assetNumber:                   "",
    name:                          "",
    description:                   "",
    category:                      CATEGORY_OPTIONS[0],
    assetAccount:                   "1220",
    depreciationAccount:            "7832",
    accumulatedDepreciationAccount: "1229",
    acquisitionDate:    new Date().toISOString().slice(0, 10),
    acquisitionCostSEK: "",
    residualValueSEK:   "0",
    usefulLifeMonths:   "60",
    depreciationMethod: "linear",
    declineRate:        "0.20",
    notes:              "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const acquisitionCost = Math.round(parseFloat(form.acquisitionCostSEK) * 100)
    const residualValue   = Math.round(parseFloat(form.residualValueSEK || "0") * 100)

    const body: Record<string, unknown> = {
      assetNumber:                   form.assetNumber,
      name:                          form.name,
      description:                   form.description || null,
      category:                      form.category,
      assetAccount:                   form.assetAccount,
      depreciationAccount:            form.depreciationAccount,
      accumulatedDepreciationAccount: form.accumulatedDepreciationAccount,
      acquisitionDate:    form.acquisitionDate,
      acquisitionCost:    acquisitionCost,
      residualValue:      residualValue,
      usefulLifeMonths:   parseInt(form.usefulLifeMonths),
      depreciationMethod: form.depreciationMethod,
      notes:              form.notes || null,
    }

    if (form.depreciationMethod === "declining_balance") {
      body.declineRate = parseFloat(form.declineRate)
    }

    const res = await fetch("/api/fixed-assets", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })

    if (res.ok) {
      const { id } = await res.json()
      router.push(`/${orgSlug}/fixed-assets/${id}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Kunde inte spara tillgången")
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/fixed-assets`} className="text-muted-foreground hover:text-foreground text-sm">
          ← Anläggningstillgångar
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-foreground mb-6">Ny anläggningstillgång</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Grunduppgifter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="assetNumber" className="text-sm font-medium text-foreground">Tillgångsnummer</label>
                <Input id="assetNumber" value={form.assetNumber} onChange={e => set("assetNumber", e.target.value)} placeholder="AT-2026-0001" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="category" className="text-sm font-medium text-foreground">Kategori</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={e => set("category", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">Namn / beskrivning</label>
              <Input id="name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="t.ex. Bärbar dator Dell XPS" required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Anskaffning</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="acquisitionDate" className="text-sm font-medium text-foreground">Anskaffningsdatum</label>
                <Input id="acquisitionDate" type="date" value={form.acquisitionDate} onChange={e => set("acquisitionDate", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="acquisitionCostSEK" className="text-sm font-medium text-foreground">Anskaffningsvärde (SEK)</label>
                <Input id="acquisitionCostSEK" type="number" min="0" step="0.01" value={form.acquisitionCostSEK} onChange={e => set("acquisitionCostSEK", e.target.value)} placeholder="25000.00" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="residualValueSEK" className="text-sm font-medium text-foreground">Restvärde (SEK)</label>
              <Input id="residualValueSEK" type="number" min="0" step="0.01" value={form.residualValueSEK} onChange={e => set("residualValueSEK", e.target.value)} />
              <p className="text-xs text-muted-foreground">Lämna 0 för full avskrivning</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Avskrivning</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="depreciationMethod" className="text-sm font-medium text-foreground">Avskrivningsmetod</label>
                <select
                  id="depreciationMethod"
                  value={form.depreciationMethod}
                  onChange={e => set("depreciationMethod", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {METHOD_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="usefulLifeMonths" className="text-sm font-medium text-foreground">Nyttjandeperiod (månader)</label>
                <Input id="usefulLifeMonths" type="number" min="1" value={form.usefulLifeMonths} onChange={e => set("usefulLifeMonths", e.target.value)} required />
              </div>
            </div>
            {form.depreciationMethod === "declining_balance" && (
              <div className="space-y-1.5">
                <label htmlFor="declineRate" className="text-sm font-medium text-foreground">Avskrivningssats (t.ex. 0.20 för 20%)</label>
                <Input id="declineRate" type="number" min="0.01" max="1" step="0.01" value={form.declineRate} onChange={e => set("declineRate", e.target.value)} required />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Bokföringskonton (BAS)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="assetAccount" className="text-sm font-medium text-foreground">Tillgångskonto</label>
                <Input id="assetAccount" value={form.assetAccount} onChange={e => set("assetAccount", e.target.value)} placeholder="1220" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="depreciationAccount" className="text-sm font-medium text-foreground">Avskrivningskonto</label>
                <Input id="depreciationAccount" value={form.depreciationAccount} onChange={e => set("depreciationAccount", e.target.value)} placeholder="7832" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="accumulatedDepreciationAccount" className="text-sm font-medium text-foreground">Ackumulerat konto</label>
                <Input id="accumulatedDepreciationAccount" value={form.accumulatedDepreciationAccount} onChange={e => set("accumulatedDepreciationAccount", e.target.value)} placeholder="1229" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Sparar..." : "Skapa tillgång"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/fixed-assets`)}>
            Avbryt
          </Button>
        </div>
      </form>
    </div>
  )
}
