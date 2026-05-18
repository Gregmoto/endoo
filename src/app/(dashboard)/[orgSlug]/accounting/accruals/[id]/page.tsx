"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Period = {
  id:        string
  period:    string
  amount:    string
  status:    string
  journalId: string | null
}

type Accrual = {
  id:             string
  accrualNumber:  string
  type:           string
  description:    string
  totalAmount:    string
  startDate:      string
  endDate:        string
  periodCount:    number
  mainAccount:    string
  accrualAccount: string
  sourceType:     string | null
  status:         string
  notes:          string | null
  periods:        Period[]
}

const TYPE_LABELS: Record<string, string> = {
  prepaid_expense: "Förutbetald kostnad",
  accrued_expense: "Upplupen kostnad",
  prepaid_revenue: "Förutbetald intäkt",
  accrued_revenue: "Upplupen intäkt",
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:    { label: "Aktiv",    cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Klar",     cls: "bg-green-100 text-green-700" },
  reversed:  { label: "Återförd", cls: "bg-muted text-muted-foreground" },
}

const PERIOD_STATUS: Record<string, { label: string; cls: string }> = {
  planned: { label: "Planerad", cls: "text-muted-foreground" },
  posted:  { label: "Bokförd",  cls: "text-green-700" },
}

function fmtAmount(öre: string | number) {
  return (Number(öre) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 }) + " kr"
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

export default function AccrualDetailPage() {
  const params = useParams<{ orgSlug: string; id: string }>()
  const { orgSlug, id } = params

  const [accrual, setAccrual] = useState<Accrual | null>(null)
  const [loading, setLoading] = useState(true)
  const [reversing, setReversing] = useState(false)
  const [reverseError, setReverseError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/accounting/accruals/${id}`)
    if (res.ok) setAccrual(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleReverse() {
    if (!confirm("Återför periodiseringen? Alla bokförda verifikat makuleras.")) return
    setReversing(true)
    setReverseError(null)
    const res = await fetch(`/api/accounting/accruals/${id}/reverse`, { method: "POST" })
    if (res.ok) {
      await load()
    } else {
      const data = await res.json().catch(() => ({}))
      setReverseError(data.error ?? "Återföringen misslyckades")
    }
    setReversing(false)
  }

  if (loading) return <div className="p-6 text-muted-foreground">Laddar...</div>
  if (!accrual) return <div className="p-6 text-destructive">Periodiseringen hittades inte.</div>

  const st = STATUS_LABELS[accrual.status] ?? { label: accrual.status, cls: "bg-muted text-muted-foreground" }
  const postedAmount = accrual.periods
    .filter(p => p.status === "posted")
    .reduce((s, p) => s + Number(p.amount), 0)
  const progress = accrual.totalAmount
    ? Math.round((postedAmount / Number(accrual.totalAmount)) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      <Link href={`/${orgSlug}/accounting/accruals`} className="text-muted-foreground hover:text-foreground text-sm">
        ← Periodiseringar
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{accrual.description}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono">{accrual.accrualNumber}</span>
            <span className="mx-2">·</span>
            {TYPE_LABELS[accrual.type] ?? accrual.type}
          </p>
        </div>
        {accrual.status !== "reversed" && (
          <Button variant="outline" onClick={handleReverse} disabled={reversing}>
            {reversing ? "Återför..." : "Återför"}
          </Button>
        )}
      </div>

      {reverseError && <p className="text-sm text-destructive">{reverseError}</p>}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Totalt belopp</p>
            <p className="text-xl font-semibold text-foreground mt-1">{fmtAmount(accrual.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bokfört</p>
            <p className="text-xl font-semibold text-foreground mt-1">{fmtAmount(String(postedAmount))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Framsteg</p>
            <p className="text-xl font-semibold text-foreground mt-1">{progress}%</p>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Detaljer</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Startdatum"        value={fmtDate(accrual.startDate)} />
            <Row label="Slutdatum"         value={fmtDate(accrual.endDate)} />
            <Row label="Antal perioder"    value={`${accrual.periodCount} månader`} />
            <Row label="Typ"               value={TYPE_LABELS[accrual.type] ?? accrual.type} />
            {accrual.sourceType && <Row label="Källa" value={accrual.sourceType} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Bokföringskonton</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Huvudkonto (resultat)"    value={accrual.mainAccount} />
            <Row label="Periodiseringskonto (balans)" value={accrual.accrualAccount} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Perioder</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2 font-medium">Period</th>
                <th className="px-4 py-2 font-medium text-right">Belopp</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Verifikat</th>
              </tr>
            </thead>
            <tbody>
              {accrual.periods.map(p => {
                const ps = PERIOD_STATUS[p.status] ?? { label: p.status, cls: "" }
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{p.period}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtAmount(p.amount)}</td>
                    <td className={`px-4 py-2 text-xs ${ps.cls}`}>{ps.label}</td>
                    <td className="px-4 py-2 text-xs font-mono text-muted-foreground">
                      {p.journalId ? p.journalId.slice(0, 8) + "…" : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
