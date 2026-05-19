"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = { id: string; name: string; customerNumber: string | null }

type ReminderInvoice = {
  id:                 string
  invoiceNumber:      string
  type:               string
  status:             string
  issueDate:          string
  dueDate:            string | null
  paidAt:             string | null
  totalAmount:        number
  paidAmount:         number
  subtotalAmount:     number
  currency:           string
  billingName:        string | null
  billingEmail:       string | null
  contactId:          string | null
  reminderCount:      number
  lastReminderAt:     string | null
  reminderFeeApplied: boolean
  contact:            Contact | null
  daysOverdue:        number
}

type Stats = {
  unpaid:  { count: number; totalAmount: number }
  overdue: { count: number; totalAmount: number }
}

type Pagination = { page: number; size: number; total: number; totalPages: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  sent:          { label: "Skickad",    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  viewed:        { label: "Visad",      cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  partial:       { label: "Delbetald", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  overdue:       { label: "Förfallen", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmount(v: number, currency = "SEK") {
  return (v / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

function DaysOverdueBadge({ days }: { days: number }) {
  if (days < 0) {
    const remaining = Math.abs(days)
    const cls = remaining <= 7
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-500"
    return <span className={cls}>+{remaining} dagar</span>
  }
  if (days === 0) return <span className="text-amber-600 dark:text-amber-400">Förfaller idag</span>
  return <span className="text-destructive">-{days} dagar</span>
}

function ReminderStatusBadge({ count, lastAt }: { count: number; lastAt: string | null }) {
  if (count === 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">Ej skickad</span>
  }
  const dateStr = lastAt ? new Date(lastAt).toLocaleDateString("sv-SE") : "—"
  const cls =
    count === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
    count === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      Påminnelse {count} — {dateStr}
    </span>
  )
}

// ─── SendReminderModal ────────────────────────────────────────────────────────

type SendReminderModalProps = {
  invoiceIds: string[]
  invoices:   ReminderInvoice[]
  onClose:    () => void
  onSent:     () => void
}

function SendReminderModal({ invoiceIds, invoices, onClose, onSent }: SendReminderModalProps) {
  const isSingle = invoiceIds.length === 1
  const singleInv = isSingle ? invoices.find(i => i.id === invoiceIds[0]) : null

  const alreadyApplied = isSingle ? (singleInv?.reminderFeeApplied ?? false) : false
  const isFirstReminder = isSingle ? (singleInv?.reminderCount ?? 0) === 0 : false

  const [addFee, setAddFee]         = useState(!alreadyApplied && isFirstReminder)
  const [method, setMethod]         = useState<"email" | "print" | "both">("email")
  const [message, setMessage]       = useState("")
  const [sending, setSending]       = useState(false)
  const [feedback, setFeedback]     = useState<string | null>(null)

  async function handleSend() {
    setSending(true)
    try {
      if (isSingle && singleInv) {
        const res = await fetch(`/api/invoices/${singleInv.id}/send-reminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addReminderFee: addFee, method, customMessage: message || null }),
        })
        if (!res.ok) throw new Error(await res.text())
      } else {
        const res = await fetch("/api/invoices/bulk/send-reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceIds, addReminderFee: addFee, method }),
        })
        if (!res.ok) throw new Error(await res.text())
      }
      setFeedback("Påminnelse skickad")
      setTimeout(() => { onSent(); onClose() }, 1200)
    } catch (e) {
      console.error(e)
      setFeedback("Fel vid skickande")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">
            {isSingle ? `Skicka påminnelse — ${singleInv?.invoiceNumber}` : `Skicka påminnelse (${invoiceIds.length} fakturor)`}
          </h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={addFee}
              disabled={alreadyApplied}
              onChange={e => setAddFee(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm text-foreground">
              Lägg till påminnelseavgift 60 kr
              {alreadyApplied && <span className="ml-2 text-muted-foreground">(redan tillagd)</span>}
            </span>
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Leveranssätt</p>
            <div className="flex gap-4">
              {(["email", "print", "both"] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                  <input
                    type="radio"
                    name="method"
                    value={opt}
                    checked={method === opt}
                    onChange={() => setMethod(opt)}
                  />
                  {opt === "email" ? "E-post" : opt === "print" ? "Utskrift" : "Båda"}
                </label>
              ))}
            </div>
          </div>

          {isSingle && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Meddelande (valfritt)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="Valfritt meddelande till kunden..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {feedback && (
            <p className={`text-sm font-medium ${feedback.startsWith("Fel") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {feedback}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose} disabled={sending}>Avbryt</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Skickar..." : "Skicka"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [tab, setTab]                 = useState<"unpaid" | "overdue">("unpaid")
  const [search, setSearch]           = useState("")
  const [contactId, setContactId]     = useState("")
  const [overdueMinDays, setOverdueMinDays] = useState(0)
  const [page, setPage]               = useState(1)
  const [size, setSize]               = useState(25)
  const [sort, setSort]               = useState("dueDate:asc")

  const [stats, setStats]             = useState<Stats | null>(null)
  const [data, setData]               = useState<ReminderInvoice[]>([])
  const [pagination, setPagination]   = useState<Pagination | null>(null)
  const [loading, setLoading]         = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen]     = useState(false)
  const [singleModalId, setSingleModalId] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders/stats")
      if (res.ok) setStats(await res.json())
    } catch {}
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tab,
        page:  String(page),
        size:  String(size),
        sort,
      })
      if (search)        params.set("q", search)
      if (contactId)     params.set("contactId", contactId)
      if (overdueMinDays > 0) params.set("overdueMinDays", String(overdueMinDays))

      const res = await fetch(`/api/reminders/invoices?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
        setPagination(json.pagination)
      }
    } catch {}
    setLoading(false)
  }, [tab, page, size, sort, search, contactId, overdueMinDays])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { setSelectedIds(new Set()) }, [tab, page])

  function toggleRow(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map(d => d.id)))
    }
  }

  function handleSortClick(col: string) {
    const [curField, curDir] = sort.split(":")
    if (curField === col) {
      setSort(`${col}:${curDir === "asc" ? "desc" : "asc"}`)
    } else {
      setSort(`${col}:asc`)
    }
  }

  const openBulkModal = () => { setSingleModalId(null); setModalOpen(true) }
  const openSingleModal = (id: string) => {
    setSingleModalId(id)
    setSelectedIds(new Set([id]))
    setModalOpen(true)
  }

  const modalInvoiceIds = singleModalId ? [singleModalId] : Array.from(selectedIds)

  function handleRefresh() {
    loadStats()
    loadData()
    setSelectedIds(new Set())
  }

  const showRemindersTab = tab === "overdue"

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-foreground">Påminnelser</h1>

      {/* Stats blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setTab("unpaid")}
          className={`text-left rounded-xl border p-5 transition-colors ${tab === "unpaid" ? "border-ring bg-accent" : "border bg-card hover:bg-accent/50"}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Obetalda fakturor</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats?.unpaid.count ?? "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {stats ? fmtAmount(stats.unpaid.totalAmount) : "Laddar..."}
              </p>
            </div>
            <span className="text-2xl opacity-40">◧</span>
          </div>
        </button>

        <button
          onClick={() => setTab("overdue")}
          className={`text-left rounded-xl border p-5 transition-colors ${tab === "overdue" ? "border-ring bg-accent" : "border bg-card hover:bg-accent/50"}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Förfallna fakturor</p>
              <p className="text-3xl font-bold text-destructive mt-1">{stats?.overdue.count ?? "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {stats ? fmtAmount(stats.overdue.totalAmount) : "Laddar..."}
              </p>
            </div>
            <span className="text-2xl opacity-40">◎</span>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border">
        {(["unpaid", "overdue"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "unpaid" ? "Obetalda" : "Påminnelser"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Sök fakturanr, kund..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
        />

        <select
          value={overdueMinDays}
          onChange={e => { setOverdueMinDays(Number(e.target.value)); setPage(1) }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={0}>Förfall — alla</option>
          <option value={7}>Förfall &gt; 7 dagar</option>
          <option value={14}>Förfall &gt; 14 dagar</option>
          <option value={30}>Förfall &gt; 30 dagar</option>
          <option value={60}>Förfall &gt; 60 dagar</option>
          <option value={90}>Förfall &gt; 90 dagar</option>
        </select>

        {selectedIds.size > 0 && (
          <Button size="sm" onClick={openBulkModal} className="ml-auto">
            Skicka påminnelse för {selectedIds.size} markerade
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.size === data.length}
                    onChange={toggleAll}
                    className="rounded border-input"
                  />
                </th>
                <SortTh col="contact" label="Kundnr" current={sort} onClick={handleSortClick} />
                <SortTh col="invoiceNumber" label="Fakturanr" current={sort} onClick={handleSortClick} />
                <SortTh col="billingName" label="Kund / Namn" current={sort} onClick={handleSortClick} />
                <SortTh col="issueDate" label="Fakturadatum" current={sort} onClick={handleSortClick} />
                <SortTh col="dueDate" label="Förfallodatum" current={sort} onClick={handleSortClick} />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dagar</th>
                <SortTh col="totalAmount" label="Totalt" current={sort} onClick={handleSortClick} />
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                {showRemindersTab && (
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Påminnelsestatus</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={showRemindersTab ? 12 : 11} className="px-4 py-8 text-center text-muted-foreground">
                    Laddar...
                  </td>
                </tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={showRemindersTab ? 12 : 11} className="px-4 py-8 text-center text-muted-foreground">
                    Inga fakturor hittades.
                  </td>
                </tr>
              )}
              {!loading && data.map(inv => {
                const statusInfo = STATUS_LABELS[inv.status] ?? { label: inv.status, cls: "bg-muted text-muted-foreground" }
                const balance = inv.totalAmount - inv.paidAmount
                return (
                  <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleRow(inv.id)}
                        className="rounded border-input"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {inv.contact?.customerNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/${orgSlug}/invoices/${inv.id}`} className="hover:underline text-foreground">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {inv.billingName ?? inv.contact?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      <DaysOverdueBadge days={inv.daysOverdue} />
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {fmtAmount(inv.totalAmount, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {fmtAmount(balance, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    {showRemindersTab && (
                      <td className="px-4 py-3">
                        <ReminderStatusBadge count={inv.reminderCount} lastAt={inv.lastReminderAt} />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSingleModal(inv.id)}
                        >
                          Skicka påminnelse
                        </Button>
                        <Link
                          href={`/${orgSlug}/invoices/new?type=interest&parentInvoiceId=${inv.id}`}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Räntefaktura
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rader per sida:</span>
            <select
              value={size}
              onChange={e => { setSize(Number(e.target.value)); setPage(1) }}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none"
            >
              {[25, 50, 100].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {pagination.page} / {pagination.totalPages} ({pagination.total} fakturor)
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              ›
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <SendReminderModal
          invoiceIds={modalInvoiceIds}
          invoices={data}
          onClose={() => { setModalOpen(false); setSingleModalId(null) }}
          onSent={handleRefresh}
        />
      )}
    </div>
  )
}

// ─── SortTh ───────────────────────────────────────────────────────────────────

function SortTh({
  col, label, current, onClick,
}: {
  col: string; label: string; current: string; onClick: (col: string) => void
}) {
  const [curField, curDir] = current.split(":")
  const active = curField === col
  return (
    <th
      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
      onClick={() => onClick(col)}
    >
      {label}
      {active && <span className="ml-1 opacity-60">{curDir === "asc" ? "↑" : "↓"}</span>}
    </th>
  )
}
