"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter }             from "next/navigation"
import Link                                 from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button }                           from "@/components/ui/button"

type LineItem = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

type Quote = {
  id:            string
  number:        string
  title:         string | null
  status:        string
  contactId:     string | null
  contactName:   string
  contactEmail:  string | null
  currency:      string
  lineItems:     LineItem[]
  notes:         string | null
  terms:         string | null
  internalNote:  string | null
  validUntil:    string | null
  sentAt:        string | null
  viewedAt:      string | null
  respondedAt:   string | null
  responseNote:  string | null
  convertedToInvoiceId:   string | null
  convertedToContractId:  string | null
  convertedAt:   string | null
  createdAt:     string
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:      { label: "Utkast",   cls: "bg-gray-100 text-gray-600" },
  sent:       { label: "Skickad",  cls: "bg-blue-100 text-blue-700" },
  viewed:     { label: "Visad",    cls: "bg-indigo-100 text-indigo-700" },
  accepted:   { label: "Godkänd", cls: "bg-green-100 text-green-700" },
  declined:   { label: "Avböjd",  cls: "bg-red-100 text-red-700" },
  expired:    { label: "Utgånget", cls: "bg-gray-100 text-gray-400" },
  cancelled:  { label: "Avbrutet", cls: "bg-gray-100 text-gray-400" },
  invoiced:   { label: "→ Faktura", cls: "bg-purple-100 text-purple-700" },
  contracted: { label: "→ Avtal",   cls: "bg-purple-100 text-purple-700" },
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

function fmt(n: number, cur: string) {
  return `${n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`
}

function calcTotals(lines: LineItem[]) {
  let subtotal = 0, tax = 0
  for (const l of lines) {
    const net = l.quantity * (l.unitPriceKr ?? 0) * (1 - (l.discountRate ?? 0))
    subtotal += net
    tax      += net * (l.taxRate ?? 0)
  }
  return { subtotal, tax, total: subtotal + tax }
}

export default function QuoteDetailPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()
  const router          = useRouter()

  const [quote,   setQuote]   = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Action state
  const [sending,    setSending]    = useState(false)
  const [converting, setConverting] = useState<null | "invoice" | "contract">(null)
  const [cancelling, setCancelling] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [contractFreq,      setContractFreq]      = useState("monthly")
  const [contractStart,     setContractStart]     = useState(new Date().toISOString().slice(0, 10))

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/quotes/${id}`)
    if (res.ok) {
      setQuote(await res.json())
    } else {
      setError("Offerten hittades inte")
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function send() {
    setSending(true)
    const res = await fetch(`/api/quotes/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? "Kunde inte skicka"); setSending(false); return }
    setSending(false)
    load()
  }

  async function convertInvoice() {
    setConverting("invoice")
    const res  = await fetch(`/api/quotes/${id}/convert-invoice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? "Kunde inte konvertera"); setConverting(null); return }
    router.push(`/${orgSlug}/invoices/${data.invoiceId}`)
  }

  async function convertContract() {
    setConverting("contract")
    const res  = await fetch(`/api/quotes/${id}/convert-contract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency: contractFreq, startDate: contractStart }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? "Kunde inte konvertera"); setConverting(null); return }
    router.push(`/${orgSlug}/contracts/${data.contractId}`)
  }

  async function cancel() {
    if (!confirm("Vill du avbryta offerten?")) return
    setCancelling(true)
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    })
    setCancelling(false)
    if (res.ok) { load() } else { const d = await res.json(); alert(d.error) }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Laddar…</div>
  }

  if (error || !quote) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error ?? "Hittades inte"}</p>
        <Link href={`/${orgSlug}/quotes`} className="text-sm text-indigo-600 mt-2 block">← Tillbaka</Link>
      </div>
    )
  }

  const st     = STATUS[quote.status] ?? { label: quote.status, cls: "bg-gray-100 text-gray-500" }
  const lines  = Array.isArray(quote.lineItems) ? quote.lineItems : []
  const totals = calcTotals(lines)
  const cur    = quote.currency

  const canSend     = ["draft", "sent"].includes(quote.status) && !!quote.contactEmail
  const canConvert  = ["accepted", "sent", "viewed"].includes(quote.status)
  const canCancel   = ["draft", "sent", "viewed"].includes(quote.status)
  const isConverted = !!(quote.convertedToInvoiceId || quote.convertedToContractId)

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${orgSlug}/quotes`} className="text-gray-400 hover:text-gray-600 text-sm">← Offerter</Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{quote.number}</h1>
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.cls}`}>{st.label}</span>
          </div>
          {quote.title && <p className="text-sm text-gray-500 mt-0.5">{quote.title}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <a href={`/api/quotes/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="min-h-[40px] text-sm">PDF</Button>
          </a>
          {canSend && (
            <Button onClick={send} disabled={sending} className="min-h-[40px] text-sm">
              {sending ? "Skickar…" : quote.status === "sent" ? "Skicka igen" : "✉ Skicka"}
            </Button>
          )}
          {canConvert && !quote.convertedToInvoiceId && (
            <Button onClick={convertInvoice} disabled={!!converting} variant="outline" className="min-h-[40px] text-sm">
              {converting === "invoice" ? "Skapar…" : "→ Faktura"}
            </Button>
          )}
          {canConvert && !quote.convertedToContractId && (
            <Button onClick={() => setShowContractModal(true)} disabled={!!converting} variant="outline" className="min-h-[40px] text-sm">
              → Avtal
            </Button>
          )}
          {canCancel && (
            <Button onClick={cancel} disabled={cancelling} variant="outline" className="min-h-[40px] text-sm text-red-600 border-red-200 hover:bg-red-50">
              {cancelling ? "Avbryter…" : "Avbryt"}
            </Button>
          )}
        </div>
      </div>

      {/* Conversion links */}
      {isConverted && (
        <div className="mb-4 rounded-lg bg-purple-50 border border-purple-100 px-4 py-3 text-sm flex flex-wrap gap-4">
          {quote.convertedToInvoiceId && (
            <Link href={`/${orgSlug}/invoices/${quote.convertedToInvoiceId}`} className="text-purple-700 font-medium hover:underline">
              Faktura skapad {fmtDate(quote.convertedAt)} →
            </Link>
          )}
          {quote.convertedToContractId && (
            <Link href={`/${orgSlug}/contracts/${quote.convertedToContractId}`} className="text-purple-700 font-medium hover:underline">
              Avtal skapad {fmtDate(quote.convertedAt)} →
            </Link>
          )}
        </div>
      )}

      {/* Customer response */}
      {quote.responseNote && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${quote.status === "accepted" ? "bg-green-50 border-green-100 text-green-800" : "bg-red-50 border-red-100 text-red-800"}`}>
          <p className="font-medium mb-0.5">Kommentar från {quote.contactName}:</p>
          <p className="italic">{quote.responseNote}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Meta */}
        <Card>
          <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Kund</p>
              <p className="text-sm font-medium text-gray-900">{quote.contactName}</p>
              {quote.contactEmail && <p className="text-xs text-gray-400">{quote.contactEmail}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Skapad</p>
              <p className="text-sm font-medium text-gray-900">{fmtDate(quote.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Giltig t.o.m.</p>
              <p className={`text-sm font-medium ${quote.validUntil && new Date(quote.validUntil) < new Date() && !["accepted", "declined", "expired"].includes(quote.status) ? "text-amber-600" : "text-gray-900"}`}>
                {fmtDate(quote.validUntil)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Svar</p>
              <p className="text-sm font-medium text-gray-900">{fmtDate(quote.respondedAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {(quote.sentAt || quote.viewedAt || quote.respondedAt) && (
          <Card>
            <CardHeader><CardTitle>Historik</CardTitle></CardHeader>
            <CardContent className="p-5">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><span className="w-24 text-xs text-gray-400">Skapad</span>{fmtDate(quote.createdAt)}</div>
                {quote.sentAt     && <div className="flex items-center gap-2 text-gray-600"><span className="w-24 text-xs text-gray-400">Skickad</span>{fmtDate(quote.sentAt)}</div>}
                {quote.viewedAt   && <div className="flex items-center gap-2 text-gray-600"><span className="w-24 text-xs text-gray-400">Öppnad</span>{fmtDate(quote.viewedAt)}</div>}
                {quote.respondedAt && (
                  <div className={`flex items-center gap-2 font-medium ${quote.status === "accepted" ? "text-green-700" : "text-red-700"}`}>
                    <span className="w-24 text-xs text-gray-400">Svar</span>
                    {quote.status === "accepted" ? "✓ Godkänd" : "✗ Avböjd"} — {fmtDate(quote.respondedAt)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line items */}
        <Card>
          <CardHeader><CardTitle>Innehåll</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="px-5 py-3 text-left font-medium">Beskrivning</th>
                    <th className="px-5 py-3 text-right font-medium">Antal</th>
                    <th className="px-5 py-3 text-left font-medium">Enhet</th>
                    <th className="px-5 py-3 text-right font-medium">À-pris</th>
                    <th className="px-5 py-3 text-right font-medium">Moms</th>
                    <th className="px-5 py-3 text-right font-medium">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const net   = l.quantity * (l.unitPriceKr ?? 0) * (1 - (l.discountRate ?? 0))
                    const total = net * (1 + (l.taxRate ?? 0))
                    return (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-5 py-3 text-gray-900">{l.description}</td>
                        <td className="px-5 py-3 text-right text-gray-500 tabular-nums">{l.quantity}</td>
                        <td className="px-5 py-3 text-gray-500">{l.unit}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{fmt(l.unitPriceKr ?? 0, cur)}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{Math.round((l.taxRate ?? 0) * 100)}%</td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">{fmt(total, cur)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex justify-end">
              <div className="w-52 space-y-1">
                <div className="flex justify-between text-sm text-gray-500"><span>Netto</span><span className="tabular-nums">{fmt(totals.subtotal, cur)}</span></div>
                <div className="flex justify-between text-sm text-gray-500"><span>Moms</span><span className="tabular-nums">{fmt(totals.tax, cur)}</span></div>
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-1"><span>Totalt</span><span className="tabular-nums">{fmt(totals.total, cur)}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes / Terms */}
        {(quote.notes || quote.terms) && (
          <Card>
            <CardContent className="p-5 space-y-3">
              {quote.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Meddelande</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Villkor</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Internal note */}
        {quote.internalNote && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-100 px-4 py-3">
            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Intern anteckning</p>
            <p className="text-sm text-yellow-800">{quote.internalNote}</p>
          </div>
        )}
      </div>

      {/* Contract conversion modal */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Skapa avtal från offert</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Faktureringsfrekvens</label>
                <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" value={contractFreq} onChange={e => setContractFreq(e.target.value)}>
                  <option value="monthly">Månadsvis</option>
                  <option value="quarterly">Kvartalsvis</option>
                  <option value="yearly">Årsvis</option>
                  <option value="weekly">Veckovis</option>
                  <option value="biweekly">Varannan vecka</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Startdatum</label>
                <input type="date" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" value={contractStart} onChange={e => setContractStart(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button onClick={convertContract} disabled={!!converting} className="flex-1">
                {converting === "contract" ? "Skapar…" : "Skapa avtal"}
              </Button>
              <Button variant="outline" onClick={() => setShowContractModal(false)}>Avbryt</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
