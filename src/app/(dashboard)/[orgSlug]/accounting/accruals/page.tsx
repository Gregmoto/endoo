"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Accrual = {
  id:             string
  accrualNumber:  string
  type:           string
  description:    string
  totalAmount:    string
  postedAmount:   string
  startDate:      string
  endDate:        string
  periodCount:    number
  mainAccount:    string
  accrualAccount: string
  status:         string
}

const TYPE_LABELS: Record<string, string> = {
  prepaid_expense: "Förutbetald kostnad",
  accrued_expense: "Upplupen kostnad",
  prepaid_revenue: "Förutbetald intäkt",
  accrued_revenue: "Upplupen intäkt",
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:    { label: "Aktiv",      cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Klar",       cls: "bg-green-100 text-green-700" },
  reversed:  { label: "Återförd",   cls: "bg-muted text-muted-foreground" },
}

function fmtAmount(öre: string) {
  return (Number(öre) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 0 }) + " kr"
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE")
}

export default function AccrualsPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [accruals, setAccruals] = useState<Accrual[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")

  useEffect(() => {
    fetch("/api/accounting/accruals")
      .then(r => r.json())
      .then(d => { setAccruals(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = accruals.filter(a =>
    !search ||
    a.description.toLowerCase().includes(search.toLowerCase()) ||
    a.accrualNumber.toLowerCase().includes(search.toLowerCase())
  )

  const totalActive    = accruals.filter(a => a.status === "active").length
  const totalPending   = accruals.filter(a => a.status === "active")
    .reduce((s, a) => s + Number(a.totalAmount) - Number(a.postedAmount), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Periodiseringar</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalActive} aktiva · {fmtAmount(String(totalPending))} kvar att bokföra</p>
        </div>
        <Button onClick={() => router.push(`/${orgSlug}/accounting/accruals/new`)}>
          + Ny periodisering
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Sök nummer eller beskrivning…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-muted-foreground">Laddar...</p>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <p className="text-lg font-medium">Inga periodiseringar</p>
              <p className="text-sm mt-1">Periodisera förutbetalda kostnader, upplupna intäkter m.m.</p>
              <Button className="mt-4" onClick={() => router.push(`/${orgSlug}/accounting/accruals/new`)}>
                + Ny periodisering
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Nummer</th>
                  <th className="px-4 py-3 font-medium">Typ</th>
                  <th className="px-4 py-3 font-medium">Beskrivning</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium text-right">Totalt</th>
                  <th className="px-4 py-3 font-medium text-right">Bokfört</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const st = STATUS_LABELS[a.status] ?? { label: a.status, cls: "bg-muted text-muted-foreground" }
                  return (
                    <tr
                      key={a.id}
                      className="border-b hover:bg-muted/40 cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/accounting/accruals/${a.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{a.accrualNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[a.type] ?? a.type}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{a.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                        <span className="ml-1 text-xs">({a.periodCount} mån)</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmtAmount(a.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtAmount(a.postedAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
