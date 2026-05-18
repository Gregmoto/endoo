"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TaskWidget } from "@/components/tasks/TaskWidget"
import { SignatureRequestModal } from "@/components/signing/SignatureRequestModal"
import { SignatureStatusWidget } from "@/components/signing/SignatureStatusWidget"
import { EmailDeliveryStatusBadge } from "@/components/email/EmailDeliveryStatusBadge"

// ─── Types ────────────────────────────────────────────────────────────────────

type LineItem = {
  id: string; description: string; quantity: number; unit: string
  unitPrice: number; taxRate: number; discountRate: number; lineTotal: number; taxAmount: number
}
type Payment = {
  id: string; amount: number; currency: string; paymentDate: string; method: string; reference: string | null; notes: string | null
}
type Contact = { id: string; name: string; email: string | null; orgNumber: string | null; addressLine1: string | null; city: string | null; country: string }
type RecurringRef = { id: string; contractNumber: string | null; name: string }

type Invoice = {
  id: string; invoiceNumber: string; status: string; type: string
  issueDate: string; dueDate: string; sentAt: string | null; paidAt: string | null
  currency: string; reference: string | null; poNumber: string | null
  notes: string | null; footerText: string | null
  subtotalAmount: number; taxAmount: number; discountAmount: number; totalAmount: number; paidAmount: number
  billingName: string | null; billingEmail: string | null; billingAddress: unknown
  contact: Contact | null
  lineItems: LineItem[]
  payments: Payment[]
  recurringSchedule: RecurringRef | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:         { label: "Utkast",    cls: "bg-muted text-muted-foreground" },
  sent:          { label: "Skickad",   cls: "bg-blue-100 text-blue-700" },
  viewed:        { label: "Visad",     cls: "bg-indigo-100 text-indigo-700" },
  partial:       { label: "Delbetald",cls: "bg-yellow-100 text-yellow-700" },
  paid:          { label: "Betald",    cls: "bg-green-100 text-green-700" },
  overdue:       { label: "Förfallen", cls: "bg-red-100 text-red-700" },
  void:          { label: "Makulerad",cls: "bg-orange-100 text-orange-700" },
  uncollectable: { label: "Osäker",    cls: "bg-red-200 text-red-800" },
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bankgiro/överföring",
  card: "Kort",
  swish: "Swish",
  cash: "Kontant",
  credit_note: "Kreditfaktura",
  other: "Övrigt",
}

function fmtMoney(v: number, currency: string) {
  return `${(v / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const params  = useParams<{ orgSlug: string; id: string }>()
  const router  = useRouter()
  const { orgSlug, id } = params

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [sendModal,    setSendModal]    = useState(false)
  const [payModal,     setPayModal]     = useState(false)
  const [cnLoading,    setCnLoading]    = useState(false)
  const [pfLoading,    setPfLoading]    = useState(false)
  const [signModal,    setSignModal]    = useState(false)
  const [signRefresh,  setSignRefresh]  = useState(0)

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setInvoice(data); setLoading(false) })
  }, [id])

  function refresh() {
    fetch(`/api/invoices/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setInvoice(data))
  }

  if (loading)  return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>
  if (!invoice) return <div className="p-8 text-sm text-red-500">Fakturan hittades inte.</div>

  const balance = invoice.totalAmount - invoice.paidAmount
  const overdue = ["sent", "viewed", "partial"].includes(invoice.status) && new Date(invoice.dueDate) < new Date()
  const displayStatus = overdue ? STATUS_LABELS.overdue : (STATUS_LABELS[invoice.status] ?? STATUS_LABELS.draft)

  async function createCreditNote() {
    if (!confirm("Skapa en kreditnota för denna faktura?")) return
    setCnLoading(true)
    const res = await fetch(`/api/invoices/${id}/credit-note`, { method: "POST" })
    if (res.ok) {
      const d = await res.json()
      router.push(`/${orgSlug}/invoices/${d.id}`)
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? "Kunde inte skapa kreditnota")
      setCnLoading(false)
    }
  }

  async function convertProforma() {
    if (!confirm("Konvertera proformafakturan till en vanlig faktura?")) return
    setPfLoading(true)
    const res = await fetch(`/api/invoices/${id}/convert-proforma`, { method: "POST" })
    if (res.ok) {
      refresh()
      setPfLoading(false)
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? "Kunde inte konvertera")
      setPfLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${orgSlug}/invoices`} className="hover:text-foreground">Fakturor</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium font-mono">{invoice.invoiceNumber}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground font-mono">{invoice.invoiceNumber}</h1>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${displayStatus.cls}`}>{displayStatus.label}</span>
            {invoice.type === "credit_note" && (
              <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-orange-100 text-orange-700">Kreditnota</span>
            )}
            {invoice.type === "proforma" && (
              <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-purple-100 text-purple-700">Proforma</span>
            )}
          </div>
          <div className="mt-1.5">
            <EmailDeliveryStatusBadge invoiceId={invoice.id} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Utfärdat {fmtDate(invoice.issueDate)} · Förfaller {fmtDate(invoice.dueDate)}
            {invoice.recurringSchedule && (
              <span className="ml-3 text-indigo-600">
                <Link href={`/${orgSlug}/contracts/${invoice.recurringSchedule.id}`}>
                  ↺ {invoice.recurringSchedule.contractNumber ?? invoice.recurringSchedule.name}
                </Link>
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap justify-end">
          <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">↓ PDF</Button>
          </a>

          {/* Proforma-specific actions */}
          {invoice.type === "proforma" && invoice.status === "draft" && (
            <Button size="sm" onClick={convertProforma} loading={pfLoading}>
              Konvertera till faktura
            </Button>
          )}

          {/* Regular invoice actions */}
          {invoice.type === "invoice" && invoice.status === "draft" && (
            <>
              <Link href={`/${orgSlug}/invoices/${id}/edit`}>
                <Button size="sm" variant="outline">Redigera</Button>
              </Link>
              <Button size="sm" onClick={() => setSendModal(true)}>Skicka</Button>
            </>
          )}
          {invoice.type === "invoice" && ["sent", "viewed", "partial"].includes(invoice.status) && (
            <>
              <Button size="sm" variant="outline" onClick={() => setSendModal(true)}>Skicka igen</Button>
              <Button size="sm" onClick={() => setPayModal(true)}>Registrera betalning</Button>
            </>
          )}
          {invoice.type === "invoice" && overdue && (
            <Button size="sm" onClick={() => setPayModal(true)}>Registrera betalning</Button>
          )}

          {/* Quote signing button */}
          {invoice.type === "quote" && ["draft", "sent"].includes(invoice.status) && (
            <Button size="sm" variant="outline" onClick={() => setSignModal(true)}>
              ✍ Signera
            </Button>
          )}

          {/* Credit note button for sent/paid regular invoices */}
          {invoice.type === "invoice" && ["sent", "viewed", "partial", "paid"].includes(invoice.status) && (
            <Button size="sm" variant="outline" onClick={createCreditNote} loading={cnLoading}>
              Skapa kreditnota
            </Button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle>Mottagare</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {invoice.contact ? (
              <div className="space-y-0.5">
                <Link href={`/${orgSlug}/contacts/${invoice.contact.id}`} className="font-medium text-foreground hover:text-indigo-600">
                  {invoice.contact.name}
                </Link>
                {invoice.contact.email    && <p className="text-muted-foreground">{invoice.contact.email}</p>}
                {invoice.contact.orgNumber && <p className="text-muted-foreground text-xs">Org.nr: {invoice.contact.orgNumber}</p>}
                {invoice.contact.addressLine1 && <p className="text-muted-foreground mt-1">{invoice.contact.addressLine1}</p>}
                {invoice.contact.city && <p className="text-muted-foreground">{invoice.contact.city}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground">Ingen kund kopplad</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Faktureringsinfo</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-1.5 text-sm">
              {invoice.poNumber && <InfoRow label="Er ref" value={invoice.poNumber} />}
              {invoice.reference && <InfoRow label="Vår ref" value={invoice.reference} />}
              <InfoRow label="Valuta" value={invoice.currency} />
              {invoice.sentAt && <InfoRow label="Skickad" value={fmtDate(invoice.sentAt)} />}
              {invoice.paidAt && <InfoRow label="Betald" value={fmtDate(invoice.paidAt)} />}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card className="mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border bg-muted">
              {["Beskrivning", "Antal", "Enhet", "À-pris", "Rabatt", "Moms", "Summa"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map(l => (
              <tr key={l.id} className="border-t border-border/50">
                <td className="px-4 py-3">{l.description}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{Number(l.quantity)}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.unit}</td>
                <td className="px-4 py-3 tabular-nums">{fmtMoney(l.unitPrice, invoice.currency)}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {Number(l.discountRate) > 0 ? `${Math.round(Number(l.discountRate) * 100)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{Math.round(Number(l.taxRate) * 100)}%</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {fmtMoney(l.lineTotal + l.taxAmount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted border-t border">
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-sm text-muted-foreground">Netto</td>
              <td className="px-4 py-2 text-right tabular-nums text-sm">{fmtMoney(invoice.subtotalAmount, invoice.currency)}</td>
            </tr>
            {Number(invoice.discountAmount) > 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-right text-sm text-muted-foreground">Rabatt</td>
                <td className="px-4 py-2 text-right tabular-nums text-sm text-green-600">-{fmtMoney(invoice.discountAmount, invoice.currency)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-sm text-muted-foreground">Moms</td>
              <td className="px-4 py-2 text-right tabular-nums text-sm">{fmtMoney(invoice.taxAmount, invoice.currency)}</td>
            </tr>
            <tr className="border-t border">
              <td colSpan={6} className="px-4 py-3 text-right font-semibold">Totalt att betala</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-base">{fmtMoney(invoice.totalAmount, invoice.currency)}</td>
            </tr>
            {Number(invoice.paidAmount) > 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-right text-sm text-green-600">Betalt</td>
                <td className="px-4 py-2 text-right tabular-nums text-sm text-green-600">-{fmtMoney(invoice.paidAmount, invoice.currency)}</td>
              </tr>
            )}
            {balance > 0 && (
              <tr className="bg-red-50">
                <td colSpan={6} className="px-4 py-2 text-right font-semibold text-red-700">Återstår</td>
                <td className="px-4 py-2 text-right font-bold tabular-nums text-red-700">{fmtMoney(balance, invoice.currency)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </Card>

      {/* Notes */}
      {(invoice.notes || invoice.footerText) && (
        <Card className="mb-6">
          <CardContent className="py-4 space-y-3">
            {invoice.notes     && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>}
            {invoice.footerText && <p className="text-xs text-muted-foreground whitespace-pre-wrap border-t border pt-3">{invoice.footerText}</p>}
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Betalningar</CardTitle>
              {["sent","viewed","partial","overdue"].includes(invoice.status) && (
                <button onClick={() => setPayModal(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  + Registrera
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border">
                  <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Datum</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Metod</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Referens</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">Belopp</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map(p => (
                  <tr key={p.id} className="border-t border-border/50">
                    <td className="px-5 py-2.5">{fmtDate(p.paymentDate)}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-green-700">{fmtMoney(p.amount, p.currency)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <DeletePaymentButton
                        invoiceId={id}
                        paymentId={p.id}
                        onDeleted={refresh}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Uppgifter</CardTitle></CardHeader>
        <CardContent>
          <TaskWidget
            orgSlug={orgSlug}
            entityType="invoice"
            entityId={id}
            entityLabel={`Faktura ${invoice.invoiceNumber}`}
          />
        </CardContent>
      </Card>

      {/* E-signering — only for quotes */}
      {invoice.type === "quote" && (
        <Card className="mb-6">
          <CardHeader><CardTitle>E-signering</CardTitle></CardHeader>
          <CardContent>
            <SignatureStatusWidget
              entityType="quote"
              entityId={id}
              onRequestSign={() => setSignModal(true)}
              refreshKey={signRefresh}
            />
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {sendModal && (
        <SendModal
          invoiceId={id}
          contactEmail={invoice.contact?.email ?? null}
          onClose={() => setSendModal(false)}
          onSent={() => { setSendModal(false); refresh() }}
        />
      )}
      {payModal && (
        <PaymentModal
          invoiceId={id}
          balance={balance}
          currency={invoice.currency}
          onClose={() => setPayModal(false)}
          onSaved={() => { setPayModal(false); refresh() }}
        />
      )}
      {signModal && (
        <SignatureRequestModal
          entityType="quote"
          entityId={id}
          defaultTitle={`Offert ${invoice.invoiceNumber}`}
          onClose={() => setSignModal(false)}
          onCreated={() => setSignRefresh(k => k + 1)}
        />
      )}
    </div>
  )
}

// ─── Send modal with PDF preview ─────────────────────────────────────────────

function SendModal({ invoiceId, contactEmail, onClose, onSent }: {
  invoiceId: string; contactEmail: string | null
  onClose: () => void; onSent: () => void
}) {
  const [email, setEmail]       = useState(contactEmail ?? "")
  const [markOnly, setMarkOnly] = useState(!contactEmail)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState("")
  const [tab, setTab]           = useState<"send" | "preview">("send")

  async function send() {
    setSending(true)
    const res = await fetch(`/api/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: markOnly ? null : email, markOnly }),
    })
    if (res.ok) { onSent() }
    else { const d = await res.json(); setError(d.error ?? "Fel"); setSending(false) }
  }

  return (
    <Modal title="Skicka faktura" onClose={onClose} wide>
      {/* Tabs */}
      <div className="flex border-b border mb-4 -mt-1">
        {(["send", "preview"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "send" ? "Skicka" : "Förhandsgranska PDF"}
          </button>
        ))}
      </div>

      {tab === "send" && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={markOnly}
              onChange={e => setMarkOnly(e.target.checked)}
              className="rounded"
            />
            Markera bara som skickad (utan e-post)
          </label>
          {!markOnly && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">E-postadress</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="mottagare@foretaget.se"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button onClick={send} loading={sending} size="sm">
              {markOnly ? "Markera som skickad" : "Skicka via e-post"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>Avbryt</Button>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="space-y-3">
          <iframe
            src={`/api/invoices/${invoiceId}/pdf`}
            className="w-full rounded border border bg-muted"
            style={{ height: "520px" }}
            title="Faktura PDF-förhandsgranskning"
          />
          <p className="text-xs text-muted-foreground text-center">
            <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer"
              className="underline hover:text-muted-foreground">Öppna i nytt fönster ↗</a>
          </p>
        </div>
      )}
    </Modal>
  )
}

// ─── Payment modal ────────────────────────────────────────────────────────────

function PaymentModal({ invoiceId, balance, currency, onClose, onSaved }: {
  invoiceId: string; balance: number; currency: string
  onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    amountKr:    (balance / 100).toFixed(2),
    paymentDate: new Date().toISOString().slice(0, 10),
    method:      "bank_transfer",
    reference:   "",
    notes:       "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountKr:    parseFloat(form.amountKr),
        paymentDate: form.paymentDate,
        method:      form.method,
        reference:   form.reference || null,
        notes:       form.notes     || null,
      }),
    })
    if (res.ok) { onSaved() }
    else { const d = await res.json(); setError(d.error ?? "Fel"); setSaving(false) }
  }

  const cls = "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

  return (
    <Modal title="Registrera betalning" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Belopp ({currency})</label>
            <input
              type="number" min="0.01" step="0.01"
              value={form.amountKr}
              onChange={e => setForm(f => ({ ...f, amountKr: e.target.value }))}
              className={cls}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Saldo: {(balance / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {currency}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Betaldatum</label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
              className={cls}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Betalningsmetod</label>
          <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className={cls}>
            <option value="bank_transfer">Bankgiro/överföring</option>
            <option value="swish">Swish</option>
            <option value="card">Kort</option>
            <option value="cash">Kontant</option>
            <option value="other">Övrigt</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Referens</label>
          <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className={cls} placeholder="OCR-nummer, referensnr…" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button onClick={save} loading={saving} size="sm">Registrera</Button>
          <Button variant="outline" size="sm" onClick={onClose}>Avbryt</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Delete payment button ────────────────────────────────────────────────────

function DeletePaymentButton({ invoiceId, paymentId, onDeleted }: {
  invoiceId: string; paymentId: string; onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  async function del() {
    if (!confirm("Ta bort betalningen?")) return
    setLoading(true)
    const res = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}`, { method: "DELETE" })
    if (res.ok) onDeleted()
    setLoading(false)
  }
  return (
    <button onClick={del} disabled={loading} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40">
      {loading ? "…" : "Ta bort"}
    </button>
  )
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, children, onClose, wide }: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-card rounded-2xl shadow-xl w-full mx-4 p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
