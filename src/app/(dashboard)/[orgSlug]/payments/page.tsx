"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = "bank_transfer" | "card" | "swish" | "cash" | "other"

const METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bankgiro",
  card:          "Kort",
  swish:         "Swish",
  cash:          "Kontant",
  other:         "Övrigt",
}

type PaymentRow = {
  id:          string
  amount:      string  // öre as string
  currency:    string
  paymentDate: string
  method:      string
  reference:   string | null
  invoiceId:   string
  invoice: {
    invoiceNumber: string
    billingName:   string | null
    contactId:     string | null
    dueDate:       string
  }
  createdAt:   string
}

type PaymentGroup = {
  date:        string
  source:      string
  label:       string
  totalAmount: number
  currency:    string
  payments:    PaymentRow[]
}

type PaymentsResponse = {
  groups:         PaymentGroup[]
  pagination:     { page: number; size: number; total: number; totalPages: number }
  ungroupedTotal: number
}

type InvoiceSuggestion = {
  id:            string
  invoiceNumber: string
  billingName:   string | null
  totalAmount:   string
  paidAmount:    string
  dueDate:       string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(ore: string | number): string {
  return new Intl.NumberFormat("sv-SE", {
    style:                 "currency",
    currency:              "SEK",
    minimumFractionDigits: 2,
  }).format(Number(ore) / 100)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const params  = useParams()
  const orgSlug = params.orgSlug as string

  // ── Payment list state ─────────────────────────────────────────────────────
  const [data,    setData]    = useState<PaymentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)

  // ── Collapsed groups ───────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // ── Selected payments (for bulk delete) ───────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Registration form ──────────────────────────────────────────────────────
  const [formDate,      setFormDate]      = useState(today())
  const [formQuery,     setFormQuery]     = useState("")
  const [formInvoiceId, setFormInvoiceId] = useState("")
  const [formAmount,    setFormAmount]    = useState("")
  const [formMethod,    setFormMethod]    = useState<PaymentMethod>("bank_transfer")
  const [formRef,       setFormRef]       = useState("")
  const [submitting,    setSubmitting]    = useState(false)
  const [formError,     setFormError]     = useState("")

  // ── Invoice autocomplete ───────────────────────────────────────────────────
  const [suggestions,       setSuggestions]       = useState<InvoiceSuggestion[]>([])
  const [showSuggestions,   setShowSuggestions]   = useState(false)
  const [selectedInvoice,   setSelectedInvoice]   = useState<InvoiceSuggestion | null>(null)
  const suggestRef = useRef<HTMLDivElement>(null)

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState("")

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  // ── Fetch payments ─────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments?page=${page}&size=25`)
      if (!res.ok) throw new Error("Fel vid hämtning")
      setData(await res.json())
    } catch {
      showToast("Kunde inte hämta betalningar")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  // ── Invoice search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (formQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/invoices?q=${encodeURIComponent(formQuery)}&tab=unpaid&size=5`)
        if (!res.ok) return
        const json = await res.json()
        setSuggestions(json.items ?? [])
        setShowSuggestions(true)
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(timer)
  }, [formQuery])

  // Close suggestion dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function selectInvoice(inv: InvoiceSuggestion) {
    setSelectedInvoice(inv)
    setFormInvoiceId(inv.id)
    setFormQuery(`${inv.invoiceNumber} — ${inv.billingName ?? ""}`)
    setShowSuggestions(false)
    const balance = (Number(inv.totalAmount) - Number(inv.paidAmount)) / 100
    setFormAmount(balance.toFixed(2))
  }

  // ── Submit payment ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formInvoiceId) { setFormError("Välj en faktura"); return }
    setFormError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/payments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          invoiceId:   formInvoiceId,
          amountKr:    parseFloat(formAmount),
          paymentDate: formDate,
          method:      formMethod,
          reference:   formRef || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setFormError(err.message ?? err.error ?? "Fel vid registrering")
        return
      }
      showToast("Betalning registrerad")
      clearForm()
      fetchPayments()
    } catch {
      setFormError("Nätverksfel — försök igen")
    } finally {
      setSubmitting(false)
    }
  }

  function clearForm() {
    setFormDate(today())
    setFormQuery("")
    setFormInvoiceId("")
    setFormAmount("")
    setFormMethod("bank_transfer")
    setFormRef("")
    setFormError("")
    setSelectedInvoice(null)
    setSuggestions([])
  }

  // ── Delete single payment ──────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Ta bort betalningen?")) return
    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" })
      if (!res.ok) { showToast("Kunde inte ta bort betalningen"); return }
      showToast("Betalning borttagen")
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s })
      fetchPayments()
    } catch {
      showToast("Nätverksfel")
    }
  }

  // ── Bulk delete ────────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Ta bort ${selected.size} markerade betalningar?`)) return
    const ids = Array.from(selected)
    await Promise.all(ids.map((id) => fetch(`/api/payments/${id}`, { method: "DELETE" })))
    showToast(`${ids.length} betalningar borttagna`)
    setSelected(new Set())
    fetchPayments()
  }

  // ── Group checkbox helpers ─────────────────────────────────────────────────
  function toggleGroupSelection(group: PaymentGroup) {
    const ids = group.payments.map((p) => p.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const s = new Set(prev)
      if (allSelected) ids.forEach((id) => s.delete(id))
      else ids.forEach((id) => s.add(id))
      return s
    })
  }

  function togglePayment(id: string) {
    setSelected((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function toggleCollapsed(date: string) {
    setCollapsed((prev) => {
      const s = new Set(prev)
      if (s.has(date)) s.delete(date)
      else s.add(date)
      return s
    })
  }

  // ── Unmatched write-off ────────────────────────────────────────────────────
  async function handleWriteOffUnmatched() {
    try {
      const res = await fetch("/api/payments/unmatched")
      if (!res.ok) return
      const json = await res.json()
      const ids = (json.items ?? []).map((p: { id: string }) => p.id)
      if (ids.length === 0) { showToast("Inga omatchade betalningar att ta bort"); return }
      if (!confirm(`Ta bort ${ids.length} ej matchade betalningar?`)) return
      const del = await fetch("/api/payments/unmatched", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids }),
      })
      if (!del.ok) { showToast("Kunde inte skriva av"); return }
      showToast(`${ids.length} ej matchade betalningar skrivna av`)
    } catch {
      showToast("Nätverksfel")
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-lg text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">INBETALNINGAR</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleWriteOffUnmatched}>
            Ta bort ej matchade
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Kommer snart"
            onClick={() => showToast("Kommer snart")}
          >
            📤 Läs in betalfil
          </Button>
        </div>
      </div>

      {/* Registration form */}
      <Card>
        <CardHeader>
          <CardTitle>Registrera betalning</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Betaldatum</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1 relative" ref={suggestRef}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faktura</label>
              <input
                type="text"
                placeholder="Sök fakturanr, kund..."
                value={formQuery}
                onChange={(e) => {
                  setFormQuery(e.target.value)
                  setFormInvoiceId("")
                  setSelectedInvoice(null)
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                  {suggestions.map((inv) => {
                    const balance = (Number(inv.totalAmount) - Number(inv.paidAmount)) / 100
                    return (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => selectInvoice(inv)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex justify-between gap-2"
                      >
                        <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                        <span className="text-muted-foreground truncate">{inv.billingName}</span>
                        <span className="text-foreground font-medium shrink-0">
                          {balance.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {selectedInvoice && (
                <p className="text-xs text-muted-foreground">
                  Saldo: {((Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Belopp (SEK)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Metod</label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.entries(METHOD_LABELS) as [PaymentMethod, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Referens</label>
              <input
                type="text"
                placeholder="OCR / referens (valfritt)"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              {formError && <p className="text-xs text-destructive">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Sparar…" : "Lägg till"}
                </Button>
                <Button type="button" variant="outline" onClick={clearForm}>
                  Rensa
                </Button>
              </div>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3">
          <span className="text-sm text-muted-foreground">{selected.size} markerade</span>
          <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            Ta bort markerade
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Avmarkera alla
          </Button>
        </div>
      )}

      {/* Payment groups */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Laddar betalningar…</div>
      ) : !data || data.groups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Inga betalningar registrerade ännu.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.groups.map((group) => {
            const isCollapsed   = collapsed.has(group.date)
            const groupIds      = group.payments.map((p) => p.id)
            const allSelected   = groupIds.length > 0 && groupIds.every((id) => selected.has(id))
            const someSelected  = groupIds.some((id) => selected.has(id))

            return (
              <Card key={group.date}>
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleCollapsed(group.date)}
                  className="w-full px-4 md:px-6 py-3 flex items-center gap-3 text-left hover:bg-accent/50 rounded-t-xl transition-colors"
                >
                  <span className="text-muted-foreground text-sm">{isCollapsed ? "▶" : "▼"}</span>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={() => toggleGroupSelection(group)}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-primary"
                  />
                  <span className="font-medium text-foreground text-sm">{group.date}</span>
                  <span className="text-muted-foreground text-sm">{group.label}</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    Totalt {group.payments.length} betalningar: {formatAmount(group.totalAmount)} {group.currency}
                  </span>
                </button>

                {/* Group rows */}
                {!isCollapsed && (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-t border-border bg-muted/50">
                            <th className="px-4 py-2 w-8"></th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">FAKTNR</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">NAMN</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">FÖRFDATUM</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">BETALDATUM</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">BETALT</th>
                            <th className="px-4 py-2 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.payments.map((p) => (
                            <tr key={p.id} className="border-t border-border/50 hover:bg-accent/30">
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selected.has(p.id)}
                                  onChange={() => togglePayment(p.id)}
                                  className="accent-primary"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  href={`/${orgSlug}/invoices/${p.invoiceId}`}
                                  className="font-mono text-primary hover:underline text-xs"
                                >
                                  {p.invoice.invoiceNumber}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-foreground">{p.invoice.billingName ?? "—"}</td>
                              <td className="px-4 py-3 text-muted-foreground">{p.invoice.dueDate}</td>
                              <td className="px-4 py-3 text-muted-foreground">{p.paymentDate}</td>
                              <td className="px-4 py-3 text-right font-medium text-foreground">{formatAmount(p.amount)}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p.id)}
                                  title="Ta bort betalning"
                                  className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-border border-t border-border">
                      {group.payments.map((p) => (
                        <div key={p.id} className="px-4 py-3 flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => togglePayment(p.id)}
                            className="accent-primary mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2">
                              <Link
                                href={`/${orgSlug}/invoices/${p.invoiceId}`}
                                className="font-mono text-primary hover:underline text-xs"
                              >
                                {p.invoice.invoiceNumber}
                              </Link>
                              <span className="font-medium text-foreground text-sm">{formatAmount(p.amount)}</span>
                            </div>
                            <p className="text-sm text-foreground truncate">{p.invoice.billingName ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">Betalat: {p.paymentDate} · Förfall: {p.invoice.dueDate}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="text-muted-foreground hover:text-destructive text-xs mt-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )
          })}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Sida {data.pagination.page} av {data.pagination.totalPages} ({data.pagination.total} betalningar)</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Föregående
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Nästa →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
