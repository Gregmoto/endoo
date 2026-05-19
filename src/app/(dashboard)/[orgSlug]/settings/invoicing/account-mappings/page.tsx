"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type SlotRow = {
  key:          string
  label:        string
  defaultValue: string
  currentValue: string
}

const SLOT_LABELS: Record<string, string> = {
  AR:         "Kundfordringar",
  AP:         "Leverantörsskulder",
  BANK:       "Bankgirokonto",
  BANK_SWISH: "Plusgiro / Swish",
  BANK_CASH:  "Kassa",
  REVENUE_25: "Intäkt 25% moms",
  REVENUE_12: "Intäkt 12% moms",
  REVENUE_6:  "Intäkt 6% moms",
  REVENUE_0:  "Momsfri intäkt",
  VAT_OUT_25: "Utgående moms 25%",
  VAT_OUT_12: "Utgående moms 12%",
  VAT_OUT_6:  "Utgående moms 6%",
  VAT_IN:     "Ingående moms",
}

export default function AccountMappingsPage() {
  const params  = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [rows, setRows]         = useState<SlotRow[]>([])
  const [edited, setEdited]     = useState<Record<string, string>>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/settings/account-mappings")
    if (res.ok) {
      const data = await res.json()
      const mappings: Record<string, string> = data.mappings
      const defaults: Record<string, string> = data.defaults
      const built: SlotRow[] = Object.keys(SLOT_LABELS).map(key => ({
        key,
        label:        SLOT_LABELS[key],
        defaultValue: defaults[key] ?? "",
        currentValue: mappings[key] ?? defaults[key] ?? "",
      }))
      setRows(built)
      setEdited({})
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleChange(key: string, value: string) {
    setEdited(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload: Record<string, string> = {}
    rows.forEach(r => { payload[r.key] = edited[r.key] ?? r.currentValue })
    const res = await fetch("/api/settings/account-mappings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await load()
    } else {
      const data = await res.json().catch(() => ({ error: "Okänt fel" }))
      setError(data.error ?? "Okänt fel")
    }
    setSaving(false)
  }

  async function handleResetToBas() {
    if (!confirm("Återställ alla kontomappningar till BAS-standardvärden?")) return
    setResetting(true)
    setError(null)
    const res = await fetch("/api/settings/account-mappings/bas/reset", { method: "POST" })
    if (res.ok) {
      await load()
    } else {
      const data = await res.json().catch(() => ({ error: "Okänt fel" }))
      setError(data.error ?? "Okänt fel")
    }
    setResetting(false)
  }

  const hasEdits = Object.keys(edited).length > 0

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${orgSlug}/settings/invoicing`} className="text-muted-foreground hover:text-foreground text-sm">← Tillbaka</Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kontomappningar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Styr vilka BAS-konton som används vid automatisk kontering.</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Konton per slot</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Laddar…</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_120px_120px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border">
                <span>Slot</span>
                <span>BAS-standard</span>
                <span>Er mappning</span>
              </div>
              {rows.map(row => (
                <div key={row.key} className="grid grid-cols-[1fr_120px_120px] gap-4 items-center px-4 py-2 hover:bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.key}</p>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">{row.defaultValue}</span>
                  <input
                    type="text"
                    value={edited[row.key] ?? row.currentValue}
                    onChange={e => handleChange(row.key, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-input rounded-lg bg-card text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={row.defaultValue}
                    maxLength={10}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleResetToBas}
          loading={resetting}
          disabled={resetting || saving}
        >
          Återställ till BAS-defaults
        </Button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-primary">Sparat!</span>}
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving || !hasEdits}
          >
            Spara ändringar
          </Button>
        </div>
      </div>
    </div>
  )
}
