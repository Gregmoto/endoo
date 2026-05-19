"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Schedule = {
  id:             string
  contractNumber: string | null
  name:           string
  title:          string | null
  status:         string
  frequency:      string
  startDate:      string
  endDate:        string | null
  nextIssueDate:  string
  lastIssuedAt:   string | null
  currency:       string
  paymentTermsDays: number
  ourReference:   string | null
  yourReference:  string | null
  autoSendMethod: string
  issuedCount:    number
  maxInvoices:    number | null
  notes:          string | null
  contact: {
    id:             string
    name:           string
    customerNumber: string | null
    email:          string | null
  } | null
  lines: {
    id:          string
    description: string
    quantity:    string
    unit:        string
    unitPrice:   string
    taxRate:     string
    discountRate: string
    sortOrder:   number
  }[]
  invoices: {
    id:            string
    invoiceNumber: string
    issueDate:     string
    dueDate:       string
    totalAmount:   string
    status:        string
  }[]
}

type PreviewEntry = {
  date:             string
  periodLabel:      string
  index:            number
  estimatedAmount:  number
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:  { label: "Aktiv",    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  paused:  { label: "Pausad",   cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  draft:   { label: "Utkast",   cls: "bg-muted text-muted-foreground" },
  ended:   { label: "Avslutad", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
}

const FREQ_LABELS: Record<string, string> = {
  weekly:     "Veckovis",
  biweekly:   "Varannan vecka",
  monthly:    "Månadsvis",
  quarterly:  "Kvartalsvis",
  halfyearly: "Halvår",
  yearly:     "Årsvis",
  custom:     "Anpassad",
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Utkast",   cls: "bg-muted text-muted-foreground" },
  sent:     { label: "Skickad",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  paid:     { label: "Betald",   cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  overdue:  { label: "Försenad", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  void:     { label: "Makulerad",cls: "bg-muted text-muted-foreground" },
}

function fmt(ore: number | string) {
  return (Number(ore) / 100).toLocaleString("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 })
}

function calcLineTotal(quantity: string, unitPrice: string, discountRate: string): number {
  return Number(quantity) * Number(unitPrice) * (1 - Number(discountRate))
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function RecurringDetailPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()
  const router = useRouter()

  const [schedule, setSchedule]   = useState<Schedule | null>(null)
  const [preview, setPreview]     = useState<PreviewEntry[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "history" | "activity">("overview")
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/recurring/${id}`)
    if (res.ok) {
      setSchedule(await res.json())
    } else if (res.status === 404) {
      setError("Avtalet hittades inte")
    }
    setLoading(false)
  }, [id])

  const loadPreview = useCallback(async () => {
    const res = await fetch(`/api/recurring/${id}/preview-schedule?count=24`)
    if (res.ok) setPreview(await res.json())
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (activeTab === "schedule") loadPreview()
  }, [activeTab, loadPreview])

  async function doAction(action: "pause" | "resume" | "end" | "generate-now") {
    setActing(true)
    try {
      const res = await fetch(`/api/recurring/${id}/${action}`, { method: "POST" })
      if (res.ok) {
        if (action === "generate-now") {
          const d = await res.json()
          router.push(`/${orgSlug}/invoices/${d.invoiceId}`)
          return
        }
        await load()
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.message ?? "Något gick fel")
      }
    } finally {
      setActing(false)
    }
  }

  // ─── Loading / error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground">
        Laddar…
      </div>
    )
  }

  if (error || !schedule) {
    return (
      <div className="p-8">
        <p className="text-foreground font-medium mb-2">{error ?? "Avtalet hittades inte"}</p>
        <Link href={`/${orgSlug}/recurring`}>
          <Button variant="outline" size="sm">← Tillbaka</Button>
        </Link>
      </div>
    )
  }

  const st = STATUS_CONFIG[schedule.status] ?? STATUS_CONFIG.draft

  const totalLineAmount = schedule.lines.reduce((sum, l) => {
    const lt  = calcLineTotal(l.quantity, l.unitPrice, l.discountRate)
    return sum + lt + lt * Number(l.taxRate)
  }, 0)

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {schedule.contractNumber && (
                <span className="font-mono text-sm text-muted-foreground">{schedule.contractNumber}</span>
              )}
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.cls}`}>
                {st.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {schedule.title ?? schedule.name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {schedule.contact && <span>{schedule.contact.name}</span>}
              <span>{FREQ_LABELS[schedule.frequency] ?? schedule.frequency}</span>
              {schedule.status === "active" && (
                <span>Nästa: {new Date(schedule.nextIssueDate).toLocaleDateString("sv-SE")}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {schedule.status === "active" && (
              <>
                <Button variant="outline" size="sm" disabled={acting} onClick={() => doAction("pause")}>
                  Pausa
                </Button>
                <Button variant="outline" size="sm" disabled={acting} onClick={() => doAction("generate-now")}>
                  Skapa nästa nu
                </Button>
              </>
            )}
            {schedule.status === "paused" && (
              <Button variant="outline" size="sm" disabled={acting} onClick={() => doAction("resume")}>
                Återuppta
              </Button>
            )}
            {(schedule.status === "active" || schedule.status === "paused") && (
              <Button
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => { if (confirm("Avsluta avtalet?")) doAction("end") }}
              >
                Avsluta
              </Button>
            )}
            {schedule.status === "draft" && (
              <Button
                size="sm"
                disabled={acting}
                onClick={async () => {
                  setActing(true)
                  const res = await fetch(`/api/recurring/${id}/activate`, { method: "POST" })
                  setActing(false)
                  if (res.ok) await load()
                  else {
                    const d = await res.json().catch(() => ({}))
                    alert(d.message ?? "Kunde inte aktivera")
                  }
                }}
              >
                Aktivera
              </Button>
            )}
            <Link href={`/${orgSlug}/recurring/${id}/edit`}>
              <Button variant="outline" size="sm">Redigera</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border">
        {(["overview", "schedule", "history", "activity"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview"  && "Översikt"}
            {t === "schedule"  && "Schema"}
            {t === "history"   && "Historik"}
            {t === "activity"  && "Aktivitet"}
          </button>
        ))}
      </div>

      {/* ── Tab: Översikt ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Avtalsinfo</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Frekvens</p>
                  <p className="text-foreground">{FREQ_LABELS[schedule.frequency] ?? schedule.frequency}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Startdatum</p>
                  <p className="text-foreground">{new Date(schedule.startDate).toLocaleDateString("sv-SE")}</p>
                </div>
                {schedule.endDate && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Slutdatum</p>
                    <p className="text-foreground">{new Date(schedule.endDate).toLocaleDateString("sv-SE")}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Betalningsvillkor</p>
                  <p className="text-foreground">{schedule.paymentTermsDays} dagar</p>
                </div>
                {schedule.ourReference && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Vår referens</p>
                    <p className="text-foreground">{schedule.ourReference}</p>
                  </div>
                )}
                {schedule.yourReference && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Er referens</p>
                    <p className="text-foreground">{schedule.yourReference}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Sändningsmetod</p>
                  <p className="text-foreground">
                    {schedule.autoSendMethod === "email"  && "E-post automatiskt"}
                    {schedule.autoSendMethod === "print"  && "Skriv ut"}
                    {schedule.autoSendMethod === "manual" && "Utkast (manuellt)"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Fakturor skapade</p>
                  <p className="text-foreground">
                    {schedule.issuedCount}
                    {schedule.maxInvoices != null ? ` / ${schedule.maxInvoices}` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Artikelrader</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border">
                    <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Beskrivning</th>
                    <th className="pb-2 text-right text-xs font-semibold text-muted-foreground">Antal</th>
                    <th className="pb-2 text-right text-xs font-semibold text-muted-foreground">À-pris</th>
                    <th className="pb-2 text-right text-xs font-semibold text-muted-foreground">Moms</th>
                    <th className="pb-2 text-right text-xs font-semibold text-muted-foreground">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.lines.map(l => {
                    const lt  = calcLineTotal(l.quantity, l.unitPrice, l.discountRate)
                    const tax = lt * Number(l.taxRate)
                    return (
                      <tr key={l.id} className="border-t border-border/50">
                        <td className="py-2 text-foreground">{l.description}</td>
                        <td className="py-2 text-right text-muted-foreground">{Number(l.quantity)} {l.unit}</td>
                        <td className="py-2 text-right text-muted-foreground">{fmt(Number(l.unitPrice))}</td>
                        <td className="py-2 text-right text-muted-foreground">{Math.round(Number(l.taxRate) * 100)}%</td>
                        <td className="py-2 text-right font-medium text-foreground">{fmt(lt + tax)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border">
                    <td colSpan={4} className="pt-2 text-right text-sm font-semibold text-foreground">Totalt</td>
                    <td className="pt-2 text-right font-semibold text-foreground">{fmt(totalLineAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Schema ── */}
      {activeTab === "schedule" && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Kommande fakturor</h2>
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Laddar schema…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border">
                    <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Fakturadatum</th>
                    <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Fakturaperiod</th>
                    <th className="pb-2 text-right text-xs font-semibold text-muted-foreground">Uppskattad summa</th>
                    <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((e, i) => {
                    const issuedDate = e.date ? new Date(e.date) : null
                    const alreadyIssued = issuedDate != null &&
                      schedule.invoices.some(inv => inv.issueDate.slice(0, 10) === e.date.slice(0, 10))
                    return (
                      <tr key={i} className="border-t border-border/50">
                        <td className="py-2 text-foreground">
                          {issuedDate?.toLocaleDateString("sv-SE")}
                        </td>
                        <td className="py-2 text-muted-foreground">{e.periodLabel}</td>
                        <td className="py-2 text-right font-medium text-foreground">
                          {fmt(e.estimatedAmount)}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            alreadyIssued
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {alreadyIssued ? "Skapad" : "Kommande"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Historik ── */}
      {activeTab === "history" && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Fakturor</h2>
            {schedule.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Inga fakturor skapade ännu</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border">
                    <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Fakturanr</th>
                    <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Datum</th>
                    <th className="pb-2 text-right text-xs font-semibold text-muted-foreground">Totalt</th>
                    <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.invoices.map(inv => {
                    const ist = INVOICE_STATUS_CONFIG[inv.status] ?? INVOICE_STATUS_CONFIG.draft
                    return (
                      <tr key={inv.id} className="border-t border-border/50">
                        <td className="py-2 font-mono text-foreground">{inv.invoiceNumber}</td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(inv.issueDate).toLocaleDateString("sv-SE")}
                        </td>
                        <td className="py-2 text-right font-medium text-foreground">
                          {fmt(Number(inv.totalAmount))}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ist.cls}`}>
                            {ist.label}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <Link
                            href={`/${orgSlug}/invoices/${inv.id}`}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Öppna →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Aktivitet ── */}
      {activeTab === "activity" && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-sm">Aktivitetslogg kommer snart</p>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
