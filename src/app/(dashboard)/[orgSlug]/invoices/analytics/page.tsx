"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { CHART } from "@/lib/analytics/chart-colors"

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthPoint = {
  label:          string
  invoicedOre:    number
  paidOre:        number
  overdueOre:     number
  newInvoices:    number
}

type TopCustomer = {
  contactId: string | null
  name:      string
  totalOre:  number
  count:     number
}

type AgingBucket = { count: number; amountOre: number }

type Data = {
  kpis: {
    outstandingOre:     number
    outstandingCount:   number
    overdueOre:         number
    overdueCount:       number
    paidMtdOre:         number
    avgDaysToPay:       number | null
    latePaymentRate:    number | null
    invoicedYtdOre:     number
  }
  trend:        MonthPoint[]
  topCustomers: TopCustomer[]
  aging: {
    current: AgingBucket
    late30:  AgingBucket
    late60:  AgingBucket
    late90:  AgingBucket
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function kr(ore: number) {
  const v = ore / 100
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Mkr`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)} kkr`
  return v.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr"
}

function monthLabel(s: string) {
  const [, m] = s.split("-")
  return ["","Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"][parseInt(m)]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />
}

function KpiCard({ label, value, sub, color, loading }: {
  label: string; value: string; sub?: string
  color?: "green" | "red" | "default"; loading?: boolean
}) {
  const valueCls = color === "green" ? "text-green-600 dark:text-green-400"
    : color === "red" ? "text-destructive"
    : "text-foreground"
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      {loading ? <Skeleton className="h-7 w-28 mb-1" /> : (
        <p className={`text-2xl font-bold tabular-nums ${valueCls}`}>{value}</p>
      )}
      {sub && (loading ? <Skeleton className="h-3.5 w-20 mt-1" /> : (
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      ))}
    </div>
  )
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-sm font-semibold text-foreground mb-4">{title}</p>
      {children}
    </div>
  )
}

function BarChart({ data, loading }: { data: MonthPoint[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-36 w-full" />
  const maxVal = Math.max(...data.map(d => d.invoicedOre), 1)
  return (
    <div className="flex items-end gap-1 h-36">
      {data.map(d => {
        const invoicedPct = (d.invoicedOre / maxVal) * 100
        const paidPct     = (d.paidOre / maxVal) * 100
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full relative" style={{ height: "112px" }}>
              {/* Invoiced bar */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-primary/20 group-hover:bg-primary/30 rounded-t transition-colors"
                style={{ height: `${invoicedPct}%` }}
                title={`Fakturerat: ${kr(d.invoicedOre)}`}
              />
              {/* Paid bar overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-green-500/50 rounded-t transition-colors"
                style={{ height: `${paidPct}%` }}
                title={`Betalt: ${kr(d.paidOre)}`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{monthLabel(d.label)}</span>
          </div>
        )
      })}
    </div>
  )
}

function AgingBar({ bucket, label, color, total }: {
  bucket: AgingBucket; label: string; color: string; total: number
}) {
  const pct = total > 0 ? (bucket.amountOre / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">
          {kr(bucket.amountOre)}{" "}
          <span className="text-muted-foreground">({bucket.count})</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InvoicingAnalyticsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const [data,    setData]    = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [snapRes, trendRes, topRes] = await Promise.all([
        fetch("/api/analytics/dashboard"),
        fetch("/api/analytics/dashboard"),
        fetch(`/api/dashboard/top-customers?year=${new Date().getFullYear()}&limit=5`),
      ])
      const snap = snapRes.ok ? await snapRes.json() : null
      const top  = topRes.ok  ? await topRes.json()  : { items: [] }

      if (snap) {
        const trend: MonthPoint[] = (snap.trend ?? []).map((t: Record<string, unknown>) => ({
          label:       String(t.label ?? ""),
          invoicedOre: Number(t.revenueOre ?? 0),
          paidOre:     Number(t.cashInOre  ?? 0),
          overdueOre:  0,
          newInvoices: Number(t.newInvoiceCount ?? 0),
        }))

        const s = snap.snapshot ?? {}
        setData({
          kpis: {
            outstandingOre:   s.outstandingAmountOre ?? 0,
            outstandingCount: s.outstandingCount ?? 0,
            overdueOre:       s.overdueAmountOre ?? 0,
            overdueCount:     s.overdueCount ?? 0,
            paidMtdOre:       s.cashInMonthOre ?? 0,
            avgDaysToPay:     s.avgDaysToPayment ?? null,
            latePaymentRate:  s.latePaymentRate ?? null,
            invoicedYtdOre:   s.revenueYtdOre ?? 0,
          },
          trend,
          topCustomers: (top.items ?? []).map((c: Record<string, unknown>) => ({
            contactId: String(c.contactId ?? ""),
            name:      String(c.name ?? ""),
            totalOre:  Number(c.total ?? 0) * 100,
            count:     0,
          })),
          aging: {
            current: s.agingBuckets?.current ?? { count: 0, amountOre: 0 },
            late30:  s.agingBuckets?.late30  ?? { count: 0, amountOre: 0 },
            late60:  s.agingBuckets?.late60  ?? { count: 0, amountOre: 0 },
            late90:  s.agingBuckets?.late90  ?? { count: 0, amountOre: 0 },
          },
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const d = data

  const agingTotal = d
    ? d.aging.current.amountOre + d.aging.late30.amountOre +
      d.aging.late60.amountOre  + d.aging.late90.amountOre
    : 0

  const maxTop = d?.topCustomers[0]?.totalOre ?? 1

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Faktureringsanalys</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("sv-SE", { year: "numeric", month: "long" })}
          </p>
        </div>
        <Link
          href={`/${orgSlug}/invoices/new`}
          className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          + Ny faktura
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Utestående"
          value={d ? kr(d.kpis.outstandingOre) : "—"}
          sub={d ? `${d.kpis.outstandingCount} fakturor` : undefined}
          loading={loading}
        />
        <KpiCard
          label="Förfallna"
          value={d ? kr(d.kpis.overdueOre) : "—"}
          sub={d ? `${d.kpis.overdueCount} fakturor` : undefined}
          color={d && d.kpis.overdueCount > 0 ? "red" : "default"}
          loading={loading}
        />
        <KpiCard
          label="Inbetalt MTD"
          value={d ? kr(d.kpis.paidMtdOre) : "—"}
          color="green"
          loading={loading}
        />
        <KpiCard
          label="Fakturerat YTD"
          value={d ? kr(d.kpis.invoicedYtdOre) : "—"}
          loading={loading}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Widget title="Fakturerat vs inbetalt (12 mån)">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary/30" />
              <span className="text-xs text-muted-foreground">Fakturerat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              <span className="text-xs text-muted-foreground">Inbetalt</span>
            </div>
          </div>
          <BarChart data={d?.trend ?? []} loading={loading} />
        </Widget>

        <Widget title="Åldersanalys — utestående">
          {loading ? <Skeleton className="h-40 w-full" /> : d && agingTotal > 0 ? (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {kr(d.kpis.outstandingOre)}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {d.kpis.outstandingCount} fakturor
                </span>
              </p>
              <AgingBar bucket={d.aging.current} label="Ej förfallna"    color={CHART.green}  total={agingTotal} />
              <AgingBar bucket={d.aging.late30}  label="1–30 dagar sen"  color={CHART.amber}  total={agingTotal} />
              <AgingBar bucket={d.aging.late60}  label="31–60 dagar sen" color={CHART.orange} total={agingTotal} />
              <AgingBar bucket={d.aging.late90}  label="60+ dagar sen"   color={CHART.red}    total={agingTotal} />
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">✓</p>
              <p className="text-sm text-muted-foreground">Inga utestående fordringar</p>
            </div>
          )}
        </Widget>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Betalningsbeteende */}
        <Widget title="Betalningsbeteende">
          {loading ? <Skeleton className="h-36 w-full" /> : d ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Snittdagar till betalning</p>
                  {d.kpis.avgDaysToPay != null ? (
                    <p className={`text-2xl font-bold tabular-nums ${
                      d.kpis.avgDaysToPay <= 0 ? "text-green-600"
                      : d.kpis.avgDaysToPay <= 10 ? "text-foreground"
                      : d.kpis.avgDaysToPay <= 30 ? "text-amber-600"
                      : "text-destructive"
                    }`}>
                      {d.kpis.avgDaysToPay > 0 ? "+" : ""}{d.kpis.avgDaysToPay.toFixed(1)} d
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">efter förfallodatum</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Andel sena</p>
                  {d.kpis.latePaymentRate != null ? (
                    <p className={`text-2xl font-bold tabular-nums ${
                      d.kpis.latePaymentRate < 0.1 ? "text-green-600"
                      : d.kpis.latePaymentRate < 0.3 ? "text-amber-600"
                      : "text-destructive"
                    }`}>
                      {(d.kpis.latePaymentRate * 100).toFixed(0)}%
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">senaste 12 månader</p>
                </div>
              </div>
              {d.kpis.latePaymentRate != null && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>I tid</span><span>Sena</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-400 rounded-l-full" style={{ width: `${(1 - d.kpis.latePaymentRate) * 100}%` }} />
                    <div className="h-full bg-red-400 rounded-r-full"   style={{ width: `${d.kpis.latePaymentRate * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Widget>

        {/* Topp 5 kunder */}
        <Widget title="Topp 5 kunder YTD">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (d?.topCustomers?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Ingen faktureringsdata</p>
          ) : (
            <ul className="space-y-3">
              {(d?.topCustomers ?? []).map((c, i) => (
                <li key={c.contactId ?? i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    {c.contactId ? (
                      <Link href={`/${orgSlug}/contacts/${c.contactId}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                        {c.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-foreground truncate block">{c.name}</span>
                    )}
                    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/50 rounded-full" style={{ width: `${Math.round((c.totalOre / maxTop) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{kr(c.totalOre)}</span>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Alla fakturor",    href: `/${orgSlug}/invoices` },
          { label: "Förfallna",        href: `/${orgSlug}/invoices/overdue` },
          { label: "Inbetalningar",    href: `/${orgSlug}/payments` },
          { label: "Påminnelser",      href: `/${orgSlug}/reminders` },
          { label: "Återkommande",     href: `/${orgSlug}/recurring` },
        ].map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {l.label} →
          </Link>
        ))}
      </div>
    </div>
  )
}
