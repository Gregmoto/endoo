"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import type { MonthPoint } from "@/lib/analytics/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

type AgingBucket = { count: number; amountOre: number }

type Snapshot = {
  outstandingCount:     number
  outstandingAmountOre: number
  overdueCount:         number
  overdueAmountOre:     number
  agingBuckets: {
    current: AgingBucket
    late30:  AgingBucket
    late60:  AgingBucket
    late90:  AgingBucket
  }
  revenueMonthOre: number
  revenueYtdOre:   number
  mrrOre:          number
  mrrChange:       number
  cashInMonthOre:  number
  cashOutMonthOre: number
  netCashflowOre:  number
  vatOutputOre:    number
  vatInputOre:     number
  vatLiabilityOre: number
  nextVatDueDate:  string | null
  activeContactCount: number
  newContactsMonth:   number
  avgDaysToPayment:   number | null
  latePaymentRate:    number | null
  computedAt: string
}

type Realtime = {
  outstanding:   { count: number; amountOre: number }
  overdueCount:  number
  paymentsToday: { count: number; amountOre: number }
  dueSoon7Days:  number
}

type DashboardData = { snapshot: Snapshot; trend: MonthPoint[] }

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtKr(ore: number, compact = false): string {
  const kr = ore / 100
  if (compact) {
    if (Math.abs(kr) >= 1_000_000) return `${(kr / 1_000_000).toFixed(1)} Mkr`
    if (Math.abs(kr) >= 1_000)    return `${(kr / 1_000).toFixed(0)} kkr`
  }
  return kr.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr"
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
}

function monthLabel(label: string): string {
  const [, m] = label.split("-")
  return ["", "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"][parseInt(m)]
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({
  data,
  keys,
  colors,
  height = 140,
}: {
  data:   MonthPoint[]
  keys:   { key: keyof MonthPoint; label: string }[]
  colors: string[]
  height?: number
}) {
  const w = 600
  const h = height
  const padL = 0, padR = 8, padT = 8, padB = 24

  const allVals = data.flatMap(d => keys.map(k => Number(d[k.key] ?? 0) / 100))
  const maxVal  = Math.max(...allVals, 1)

  const barW  = Math.floor((w - padL - padR) / data.length)
  const groupW = barW * 0.85
  const singleW = groupW / keys.length

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line
          key={t}
          x1={padL} x2={w - padR}
          y1={padT + (h - padT - padB) * (1 - t)}
          y2={padT + (h - padT - padB) * (1 - t)}
          stroke="#f3f4f6" strokeWidth={1}
        />
      ))}

      {data.map((pt, i) => {
        const x = padL + i * barW + (barW - groupW) / 2
        return (
          <g key={pt.label}>
            {keys.map((k, ki) => {
              const val  = Number(pt[k.key] ?? 0) / 100
              const barH = ((h - padT - padB) * val) / maxVal
              const bx   = x + ki * singleW
              const by   = padT + (h - padT - padB) - barH
              return (
                <rect
                  key={k.key as string}
                  x={bx} y={by}
                  width={singleW - 1}
                  height={Math.max(barH, 0)}
                  fill={colors[ki]}
                  rx={2}
                >
                  <title>{k.label}: {fmtKr(Number(pt[k.key] ?? 0))}</title>
                </rect>
              )
            })}
            <text
              x={x + groupW / 2}
              y={h - padB + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#9ca3af"
            >
              {monthLabel(pt.label)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

function LineChart({
  data,
  keys,
  colors,
  height = 140,
}: {
  data:   MonthPoint[]
  keys:   { key: keyof MonthPoint; label: string }[]
  colors: string[]
  height?: number
}) {
  const w = 600
  const h = height
  const padL = 4, padR = 8, padT = 8, padB = 24

  const allVals  = data.flatMap(d => keys.map(k => Number(d[k.key] ?? 0) / 100))
  const minVal   = Math.min(...allVals, 0)
  const maxVal   = Math.max(...allVals, 1)
  const range    = maxVal - minVal || 1
  const innerW   = w - padL - padR
  const innerH   = h - padT - padB

  function px(i: number)  { return padL + (i / (data.length - 1)) * innerW }
  function py(v: number)  { return padT + innerH - ((v - minVal) / range) * innerH }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line
          key={t}
          x1={padL} x2={w - padR}
          y1={padT + innerH * (1 - t)}
          y2={padT + innerH * (1 - t)}
          stroke="#f3f4f6" strokeWidth={1}
        />
      ))}

      {data.length > 1 && keys.map((k, ki) => {
        const pts = data.map((pt, i) => `${px(i)},${py(Number(pt[k.key] ?? 0) / 100)}`)
        return (
          <polyline
            key={k.key as string}
            points={pts.join(" ")}
            fill="none"
            stroke={colors[ki]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )
      })}

      {data.map((pt, i) => (
        <text
          key={pt.label}
          x={px(i)}
          y={h - padB + 14}
          textAnchor="middle"
          fontSize={9}
          fill="#9ca3af"
        >
          {monthLabel(pt.label)}
        </text>
      ))}
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-100 animate-pulse rounded-lg ${className}`} />
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, subCls = "text-gray-400", loading,
}: {
  label: string
  value: string
  sub?: string
  subCls?: string
  loading?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      {loading
        ? <Skeleton className="h-7 w-28 mb-1" />
        : <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      }
      {sub && (loading
        ? <Skeleton className="h-4 w-20 mt-1" />
        : <p className={`text-xs font-medium mt-0.5 ${subCls}`}>{sub}</p>
      )}
    </div>
  )
}

// ─── Widget wrapper ────────────────────────────────────────────────────────────

function Widget({ title, children, action }: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Aging bar ────────────────────────────────────────────────────────────────

function AgingBar({ bucket, label, color, total }: {
  bucket: AgingBucket
  label:  string
  color:  string
  total:  number
}) {
  const pct = total > 0 ? (bucket.amountOre / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700 tabular-nums">
          {fmtKr(bucket.amountOre, true)}
          <span className="text-gray-400 ml-1">({bucket.count})</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ─── Legend dot ───────────────────────────────────────────────────────────────

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-4 mb-3">
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: it.color }} />
          <span className="text-xs text-gray-500">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  useParams<{ orgSlug: string }>()

  const [data,     setData]     = useState<DashboardData | null>(null)
  const [rt,       setRt]       = useState<Realtime | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [rtLoading, setRtLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,    setError]    = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/analytics/dashboard")
      if (!res.ok) throw new Error("API error")
      setData(await res.json())
    } catch {
      setError("Kunde inte ladda analytics")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRealtime = useCallback(async () => {
    setRtLoading(true)
    try {
      const res = await fetch("/api/analytics/realtime")
      if (res.ok) setRt(await res.json())
    } finally {
      setRtLoading(false)
    }
  }, [])

  useEffect(() => { load(); loadRealtime() }, [load, loadRealtime])

  async function refresh() {
    setRefreshing(true)
    await fetch("/api/analytics/refresh", { method: "POST" })
    await load()
    setRefreshing(false)
  }

  const snap  = data?.snapshot
  const trend = data?.trend ?? []

  const agingTotal = snap
    ? snap.agingBuckets.current.amountOre + snap.agingBuckets.late30.amountOre +
      snap.agingBuckets.late60.amountOre  + snap.agingBuckets.late90.amountOre
    : 0

  const vatPct = snap && snap.vatOutputOre > 0
    ? (snap.vatInputOre / snap.vatOutputOre) * 100
    : 0

  const mrrChangeCls = !snap ? "text-gray-400"
    : snap.mrrChange > 0 ? "text-green-600"
    : snap.mrrChange < 0 ? "text-red-500"
    : "text-gray-400"

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analys</h1>
          {snap && (
            <p className="text-xs text-gray-400 mt-0.5">
              Uppdaterad {new Date(snap.computedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {refreshing ? "Uppdaterar…" : "↺ Uppdatera"}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Real-time strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Utestående"
          value={rt ? fmtKr(rt.outstanding.amountOre, true) : "—"}
          sub={rt ? `${rt.outstanding.count} fakturor` : undefined}
          loading={rtLoading}
        />
        <KpiCard
          label="Förfallna"
          value={rt ? String(rt.overdueCount) : "—"}
          sub="just nu"
          subCls={rt && rt.overdueCount > 0 ? "text-red-500" : "text-gray-400"}
          loading={rtLoading}
        />
        <KpiCard
          label="Inbetalt idag"
          value={rt ? fmtKr(rt.paymentsToday.amountOre, true) : "—"}
          sub={rt ? `${rt.paymentsToday.count} bet.` : undefined}
          loading={rtLoading}
        />
        <KpiCard
          label="Förfaller snart"
          value={rt ? String(rt.dueSoon7Days) : "—"}
          sub="inom 7 dagar"
          loading={rtLoading}
        />
      </div>

      {/* MRR + Revenue + Cashflow KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="MRR"
          value={snap ? fmtKr(snap.mrrOre, true) : "—"}
          sub={snap ? fmtPct(snap.mrrChange) : undefined}
          subCls={mrrChangeCls}
          loading={loading}
        />
        <KpiCard
          label="Omsättning MTD"
          value={snap ? fmtKr(snap.revenueMonthOre, true) : "—"}
          sub={snap ? `YTD: ${fmtKr(snap.revenueYtdOre, true)}` : undefined}
          loading={loading}
        />
        <KpiCard
          label="Kassaflöde MTD"
          value={snap ? fmtKr(snap.netCashflowOre, true) : "—"}
          sub={snap ? `In: ${fmtKr(snap.cashInMonthOre, true)}` : undefined}
          subCls={snap && snap.netCashflowOre >= 0 ? "text-green-600" : "text-red-500"}
          loading={loading}
        />
        <KpiCard
          label="Aktiva kunder"
          value={snap ? String(snap.activeContactCount) : "—"}
          sub={snap ? `+${snap.newContactsMonth} denna månad` : undefined}
          subCls="text-green-600"
          loading={loading}
        />
      </div>

      {/* Charts row 1: Revenue + Cashflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Widget title="Omsättning (12 månader)">
          {loading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <>
              <Legend items={[{ label: "Fakturerat (exkl. moms)", color: "#6366f1" }]} />
              <BarChart
                data={trend}
                keys={[{ key: "revenueOre", label: "Fakturerat" }]}
                colors={["#6366f1"]}
                height={140}
              />
            </>
          )}
        </Widget>

        <Widget title="Kassaflöde (12 månader)">
          {loading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <>
              <Legend items={[
                { label: "In",  color: "#22c55e" },
                { label: "Ut",  color: "#f87171" },
              ]} />
              <BarChart
                data={trend}
                keys={[
                  { key: "cashInOre",  label: "Inbetalningar" },
                  { key: "cashOutOre", label: "Utbetalningar" },
                ]}
                colors={["#22c55e", "#f87171"]}
                height={140}
              />
            </>
          )}
        </Widget>
      </div>

      {/* Charts row 2: Outstanding aging + VAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Widget title="Utestående fordringar — åldersanalys">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : snap && agingTotal > 0 ? (
            <div className="space-y-3">
              <div className="text-2xl font-bold text-gray-900 tabular-nums mb-4">
                {fmtKr(snap.outstandingAmountOre, true)}
                <span className="text-sm font-normal text-gray-400 ml-2">
                  {snap.outstandingCount} fakturor
                </span>
              </div>
              <AgingBar bucket={snap.agingBuckets.current} label="Ej förfallna"    color="#22c55e" total={agingTotal} />
              <AgingBar bucket={snap.agingBuckets.late30}  label="1–30 dagar sen"  color="#f59e0b" total={agingTotal} />
              <AgingBar bucket={snap.agingBuckets.late60}  label="31–60 dagar sen" color="#f97316" total={agingTotal} />
              <AgingBar bucket={snap.agingBuckets.late90}  label="60+ dagar sen"   color="#ef4444" total={agingTotal} />
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">✓</p>
              <p className="text-sm text-gray-400">Inga utestående fordringar</p>
            </div>
          )}
        </Widget>

        <Widget title="Momsprognos — aktuell period">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : snap ? (
            <div className="space-y-4">
              {snap.nextVatDueDate && (
                <p className="text-xs text-gray-400">
                  Förfaller:{" "}
                  <span className="font-medium text-gray-700">
                    {new Date(snap.nextVatDueDate).toLocaleDateString("sv-SE")}
                  </span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Utgående moms</p>
                  <p className="font-semibold text-gray-900 tabular-nums">{fmtKr(snap.vatOutputOre, true)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Ingående moms</p>
                  <p className="font-semibold text-green-600 tabular-nums">−{fmtKr(snap.vatInputOre, true)}</p>
                </div>
              </div>

              {/* VAT gauge */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Ingående avräkning</span>
                  <span>{vatPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(vatPct, 100)}%`,
                      background: vatPct >= 80 ? "#22c55e" : vatPct >= 40 ? "#f59e0b" : "#6366f1",
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-500">Att betala (netto)</span>
                  <span className={`text-lg font-bold tabular-nums ${snap.vatLiabilityOre > 0 ? "text-red-600" : "text-green-600"}`}>
                    {fmtKr(Math.abs(snap.vatLiabilityOre), true)}
                    {snap.vatLiabilityOre < 0 && <span className="text-xs font-normal ml-1 text-green-500">att få tillbaka</span>}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">Ingen momsperiod hittad</p>
            </div>
          )}
        </Widget>
      </div>

      {/* Charts row 3: MRR trend + Payment behaviour */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Widget title="MRR-trend (12 månader)">
          {loading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <>
              <Legend items={[{ label: "MRR", color: "#8b5cf6" }]} />
              <LineChart
                data={trend}
                keys={[{ key: "mrrOre", label: "MRR" }]}
                colors={["#8b5cf6"]}
                height={140}
              />
            </>
          )}
        </Widget>

        <Widget title="Betalningsbeteende">
          {loading ? (
            <Skeleton className="h-36 w-full" />
          ) : snap ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Snittdagar till betalning</p>
                  {snap.avgDaysToPayment != null ? (
                    <p className={`text-2xl font-bold tabular-nums ${
                      snap.avgDaysToPayment <= 0 ? "text-green-600"
                      : snap.avgDaysToPayment <= 10 ? "text-gray-900"
                      : snap.avgDaysToPayment <= 30 ? "text-amber-600"
                      : "text-red-600"
                    }`}>
                      {snap.avgDaysToPayment > 0 ? "+" : ""}{snap.avgDaysToPayment.toFixed(1)} d
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-300">—</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">efter förfallodatum</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Andel sena betalningar</p>
                  {snap.latePaymentRate != null ? (
                    <p className={`text-2xl font-bold tabular-nums ${
                      snap.latePaymentRate < 0.1 ? "text-green-600"
                      : snap.latePaymentRate < 0.3 ? "text-amber-600"
                      : "text-red-600"
                    }`}>
                      {(snap.latePaymentRate * 100).toFixed(0)}%
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-300">—</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">senaste 12 månader</p>
                </div>
              </div>

              {snap.latePaymentRate != null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>I tid</span>
                    <span>Sena</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-green-400 rounded-l-full transition-all"
                      style={{ width: `${(1 - snap.latePaymentRate) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-400 rounded-r-full"
                      style={{ width: `${snap.latePaymentRate * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">Ingen data</p>
            </div>
          )}
        </Widget>
      </div>

      {/* New contacts trend */}
      <div className="mb-4">
        <Widget title="Nya kunder per månad">
          {loading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <>
              <Legend items={[{ label: "Nya kunder", color: "#06b6d4" }]} />
              <BarChart
                data={trend}
                keys={[{ key: "newContactCount", label: "Nya kunder" }]}
                colors={["#06b6d4"]}
                height={110}
              />
            </>
          )}
        </Widget>
      </div>

      <p className="text-center text-xs text-gray-300 pb-4">
        Alla belopp exkl. moms om inget annat anges · Uppdateras var 60:e minut
      </p>
    </div>
  )
}
