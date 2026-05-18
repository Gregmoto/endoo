"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ScheduleLine = {
  period:             string
  depreciationAmount: string
  accumulatedAmount:  string
  bookValue:          string
  status:             string
  journalId:          string | null
}

type Asset = {
  id:                             string
  assetNumber:                    string
  name:                           string
  description:                    string | null
  category:                       string
  assetAccount:                   string
  depreciationAccount:            string
  accumulatedDepreciationAccount: string
  acquisitionDate:                string
  acquisitionCost:                string
  residualValue:                  string
  disposalProceeds:               string | null
  usefulLifeMonths:               number
  depreciationMethod:             string
  declineRate:                    string | null
  status:                         string
  disposalDate:                   string | null
  notes:                          string | null
  schedules:                      ScheduleLine[]
}

const METHOD_LABELS: Record<string, string> = {
  linear:            "Linjär",
  declining_balance: "Degressiv",
  tax_book:          "Räkenskapsenlig 30%",
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:      { label: "Aktiv",      cls: "bg-green-100 text-green-700" },
  disposed:    { label: "Utrangerad", cls: "bg-muted text-muted-foreground" },
  written_off: { label: "Avskriven",  cls: "bg-muted text-muted-foreground" },
}

const SCHEDULE_STATUS: Record<string, { label: string; cls: string }> = {
  planned:  { label: "Planerad",   cls: "text-muted-foreground" },
  posted:   { label: "Bokförd",    cls: "text-green-700" },
  reversed: { label: "Återförd",   cls: "text-destructive" },
}

function fmtAmount(öre: string | number) {
  return (Number(öre) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr"
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

export default function FixedAssetDetailPage() {
  const params  = useParams<{ orgSlug: string; id: string }>()
  const router  = useRouter()
  const { orgSlug, id } = params

  const [asset, setAsset]     = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)

  const [showDispose, setShowDispose] = useState(false)
  const [disposalDate, setDisposalDate]   = useState(new Date().toISOString().slice(0, 10))
  const [proceeds, setProceeds]           = useState("0")
  const [disposing, setDisposing]         = useState(false)
  const [disposeError, setDisposeError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/fixed-assets/${id}`)
    if (res.ok) { setAsset(await res.json()) }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDispose(e: React.FormEvent) {
    e.preventDefault()
    setDisposeError(null)
    setDisposing(true)
    const res = await fetch(`/api/fixed-assets/${id}/dispose`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ disposalDate, proceeds: Math.round(parseFloat(proceeds) * 100) }),
    })
    if (res.ok) {
      await load()
      setShowDispose(false)
    } else {
      const data = await res.json().catch(() => ({}))
      setDisposeError(data.error ?? "Utrangeringen misslyckades")
    }
    setDisposing(false)
  }

  if (loading) return <div className="p-6 text-muted-foreground">Laddar...</div>
  if (!asset)  return <div className="p-6 text-destructive">Tillgången hittades inte.</div>

  const st = STATUS_LABELS[asset.status] ?? { label: asset.status, cls: "bg-muted text-muted-foreground" }
  const lastPosted = [...asset.schedules].filter(s => s.status === "posted").pop()
  const currentBookValue = lastPosted ? lastPosted.bookValue : asset.acquisitionCost
  const totalDepreciation = asset.acquisitionCost ? (Number(asset.acquisitionCost) - Number(currentBookValue)).toString() : "0"

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${orgSlug}/fixed-assets`} className="text-muted-foreground hover:text-foreground text-sm">
          ← Anläggningstillgångar
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{asset.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{asset.assetNumber}</p>
        </div>
        {asset.status === "active" && (
          <Button variant="outline" onClick={() => setShowDispose(true)}>
            Utrangera
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Anskaffningsvärde</p>
            <p className="text-xl font-semibold text-foreground mt-1">{fmtAmount(asset.acquisitionCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bokfört värde</p>
            <p className="text-xl font-semibold text-foreground mt-1">{fmtAmount(currentBookValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Ackumulerade avskrivningar</p>
            <p className="text-xl font-semibold text-foreground mt-1">{fmtAmount(totalDepreciation)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Detaljer</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Kategori"          value={asset.category} />
            <Row label="Anskaffningsdatum" value={fmtDate(asset.acquisitionDate)} />
            <Row label="Restvärde"         value={fmtAmount(asset.residualValue)} />
            <Row label="Nyttjandeperiod"   value={`${asset.usefulLifeMonths} månader`} />
            <Row label="Avskrivningsmetod" value={METHOD_LABELS[asset.depreciationMethod] ?? asset.depreciationMethod} />
            {asset.declineRate && <Row label="Avskrivningssats" value={`${(Number(asset.declineRate) * 100).toFixed(0)}%`} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Bokföringskonton</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Tillgångskonto"    value={asset.assetAccount} />
            <Row label="Avskrivningskonto" value={asset.depreciationAccount} />
            <Row label="Ackumulerat konto" value={asset.accumulatedDepreciationAccount} />
            {asset.disposalDate && <Row label="Utrangeringsdatum" value={fmtDate(asset.disposalDate)} />}
            {asset.disposalProceeds !== null && <Row label="Försäljningspris" value={fmtAmount(asset.disposalProceeds)} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Avskrivningsplan</CardTitle></CardHeader>
        <CardContent className="p-0">
          {asset.schedules.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">Ingen avskrivningsplan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="px-4 py-2 font-medium">Period</th>
                    <th className="px-4 py-2 font-medium text-right">Avskrivning</th>
                    <th className="px-4 py-2 font-medium text-right">Ackumulerat</th>
                    <th className="px-4 py-2 font-medium text-right">Bokfört värde</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {asset.schedules.map(s => {
                    const ss = SCHEDULE_STATUS[s.status] ?? { label: s.status, cls: "" }
                    return (
                      <tr key={s.period} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{s.period}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmtAmount(s.depreciationAmount)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmtAmount(s.accumulatedAmount)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmtAmount(s.bookValue)}</td>
                        <td className={`px-4 py-2 text-xs ${ss.cls}`}>{ss.label}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showDispose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Utrangera tillgång</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleDispose} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="disposalDate" className="text-sm font-medium text-foreground">Utrangeringsdatum</label>
                  <Input id="disposalDate" type="date" value={disposalDate} onChange={e => setDisposalDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="proceeds" className="text-sm font-medium text-foreground">Försäljningspris (SEK)</label>
                  <Input id="proceeds" type="number" min="0" step="0.01" value={proceeds} onChange={e => setProceeds(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Lämna 0 om tillgången skrotas utan ersättning.</p>
                </div>
                {disposeError && <p className="text-sm text-destructive">{disposeError}</p>}
                <div className="flex gap-3">
                  <Button type="submit" disabled={disposing} variant="danger">
                    {disposing ? "Utrangerar..." : "Bekräfta utrangering"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDispose(false)}>
                    Avbryt
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  )
}
