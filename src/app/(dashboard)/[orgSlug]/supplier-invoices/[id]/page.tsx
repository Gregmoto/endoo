"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter }              from "next/navigation"
import Link                                  from "next/link"
import { TaskWidget } from "@/components/tasks/TaskWidget"

type Invoice = {
  id:                string
  status:            string
  extractionStatus:  string
  fileKey:           string
  fileName:          string
  fileMimeType:      string
  supplierName?:     string | null
  supplierOrgNumber?: string | null
  invoiceNumber?:    string | null
  ocrNumber?:        string | null
  invoiceDate?:      string | null
  dueDate?:          string | null
  currency:          string
  amountExclVat?:    number | null
  vatAmount?:        number | null
  amountInclVat?:    number | null
  vatRate?:          number | null
  bankgiro?:         string | null
  iban?:             string | null
  aiConfidence?:     Record<string, number> | null
  journalId?:        string | null
  paidAt?:           string | null
  supplier?:         { id: string; name: string; defaultExpenseAccountNumber?: string | null } | null
  duplicateOf?:      string | null
}

type DuplicateWarning = { isDuplicate: boolean; type?: "hard" | "soft"; existingId?: string; existingReference?: string }

function formatAmount(ore: number | null | undefined, currency = "SEK") {
  if (ore == null) return "—"
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency }).format(ore / 100)
}

function ConfidenceDot({ score }: { score?: number }) {
  if (score == null) return null
  const color = score >= 0.95 ? "bg-green-500" : score >= 0.7 ? "bg-yellow-400" : "bg-red-400"
  const label = score >= 0.95 ? "Hög" : score >= 0.7 ? "Osäker" : "Låg"
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color} mr-1.5`} title={`Konfidens: ${label} (${Math.round(score * 100)}%)`} />
  )
}

function Field({
  label, value, fieldKey, confidence, editing, onChange,
}: {
  label:      string
  value:      string
  fieldKey:   string
  confidence?: number
  editing:    boolean
  onChange:   (k: string, v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        <ConfidenceDot score={confidence} />
        {label}
      </label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <p className="text-sm text-gray-900">{value || <span className="text-gray-400 italic">Ej extraherat</span>}</p>
      )}
    </div>
  )
}

export default function SupplierInvoiceDetailPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()
  const router          = useRouter()

  const [invoice,   setInvoice]   = useState<Invoice | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [booking,   setBooking]   = useState(false)
  const [paying,    setPaying]    = useState(false)
  const [duplicate, setDuplicate] = useState<DuplicateWarning | null>(null)
  const [error,     setError]     = useState("")

  // Edit form state
  const [fields, setFields] = useState<Record<string, string>>({})
  const [expenseAccount, setExpenseAccount] = useState("6420")
  const [paymentDate,    setPaymentDate]    = useState("")
  const [paymentMethod,  setPaymentMethod]  = useState("bank_transfer")
  const [showPayForm,    setShowPayForm]    = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/supplier-invoices/${id}`)
    if (res.ok) {
      const d = await res.json()
      const inv: Invoice = d.invoice
      setInvoice(inv)
      setFields({
        supplierName:      inv.supplierName      ?? "",
        supplierOrgNumber: inv.supplierOrgNumber ?? "",
        invoiceNumber:     inv.invoiceNumber     ?? "",
        ocrNumber:         inv.ocrNumber         ?? "",
        invoiceDate:       inv.invoiceDate?.slice(0, 10) ?? "",
        dueDate:           inv.dueDate?.slice(0, 10)     ?? "",
        bankgiro:          inv.bankgiro          ?? "",
        iban:              inv.iban              ?? "",
        amountExclVat:     inv.amountExclVat != null ? String(inv.amountExclVat / 100) : "",
        vatAmount:         inv.vatAmount        != null ? String(inv.vatAmount    / 100) : "",
        amountInclVat:     inv.amountInclVat    != null ? String(inv.amountInclVat / 100) : "",
      })
      if (inv.supplier?.defaultExpenseAccountNumber) {
        setExpenseAccount(inv.supplier.defaultExpenseAccountNumber)
      }
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // Poll while extracting
  useEffect(() => {
    if (invoice?.extractionStatus !== "processing" && invoice?.status !== "extracting") return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [invoice?.extractionStatus, invoice?.status, load])

  async function handleSave() {
    setSaving(true)
    setError("")
    const res = await fetch(`/api/supplier-invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName:      fields.supplierName      || null,
        supplierOrgNumber: fields.supplierOrgNumber || null,
        invoiceNumber:     fields.invoiceNumber     || null,
        ocrNumber:         fields.ocrNumber         || null,
        invoiceDate:       fields.invoiceDate        || null,
        dueDate:           fields.dueDate            || null,
        bankgiro:          fields.bankgiro           || null,
        iban:              fields.iban               || null,
        amountExclVat:     fields.amountExclVat  ? parseFloat(fields.amountExclVat)  : null,
        vatAmount:         fields.vatAmount       ? parseFloat(fields.vatAmount)      : null,
        amountInclVat:     fields.amountInclVat   ? parseFloat(fields.amountInclVat) : null,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      setInvoice(d.invoice)
      if (d.duplicate?.isDuplicate) setDuplicate(d.duplicate)
      setEditing(false)
    } else {
      setError(d.error ?? "Kunde inte spara")
    }
    setSaving(false)
  }

  async function handleApprove() {
    setSaving(true)
    const res = await fetch(`/api/supplier-invoices/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "approved" }),
    })
    if (res.ok) { const d = await res.json(); setInvoice(d.invoice) }
    setSaving(false)
  }

  async function handleBook() {
    setBooking(true)
    setError("")
    const res = await fetch(`/api/supplier-invoices/${id}/book`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ expenseAccountNumber: expenseAccount }),
    })
    const d = await res.json()
    if (res.ok) {
      setInvoice(d.invoice)
    } else {
      setError(d.error ?? "Bokföring misslyckades")
    }
    setBooking(false)
  }

  async function handlePay() {
    setPaying(true)
    setError("")
    const amount = invoice?.amountInclVat != null ? invoice.amountInclVat / 100 : 0
    const res = await fetch(`/api/supplier-invoices/${id}/pay`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paidAt:        paymentDate || new Date().toISOString().slice(0, 10),
        paidAmount:    amount,
        paymentMethod,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      setInvoice(d.invoice)
      setShowPayForm(false)
    } else {
      setError(d.error ?? "Betalning misslyckades")
    }
    setPaying(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Laddar…</div>
  if (!invoice) return <div className="p-8 text-center text-gray-400">Fakturan hittades inte</div>

  const conf = invoice.aiConfidence ?? {}
  const isExtracting = invoice.extractionStatus === "processing" || invoice.status === "extracting"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href={`/${orgSlug}/supplier-invoices`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Leverantörsfakturor
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            {invoice.supplierName ?? invoice.fileName}
          </h1>
          {invoice.invoiceNumber && (
            <p className="text-sm text-gray-500 font-mono">{invoice.invoiceNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicate?.isDuplicate && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
          duplicate.type === "hard" ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"
        }`}>
          {duplicate.type === "hard"
            ? `⛔ Trolig dubblett av: ${duplicate.existingReference} — kontrollera innan du bokför`
            : `⚠️ Möjlig dubblett av: ${duplicate.existingReference} — kontrollera datum och belopp`}
        </div>
      )}

      {/* Extraction in progress */}
      {isExtracting && (
        <div className="mb-4 px-4 py-3 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-200 flex items-center gap-2">
          <span className="animate-spin inline-block">⟳</span>
          Claude analyserar fakturan…
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: file preview + actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* File preview */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">ORIGINALFIL</p>
            {invoice.fileMimeType === "application/pdf" ? (
              <iframe src={invoice.fileKey} className="w-full h-80 rounded border border-gray-100" />
            ) : (
              <img src={invoice.fileKey} alt="Faktura" className="w-full rounded border border-gray-100 object-contain max-h-80" />
            )}
            <a
              href={invoice.fileKey}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-xs text-indigo-600 hover:underline text-center"
            >
              Öppna i ny flik →
            </a>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500">ÅTGÄRDER</p>

            {/* Approve */}
            {invoice.status === "needs_review" && (
              <button
                onClick={handleApprove}
                disabled={saving}
                className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                ✓ Godkänn faktura
              </button>
            )}

            {/* Book */}
            {(invoice.status === "approved" || invoice.status === "needs_review") && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Kostnadskonto</label>
                  <input
                    type="text"
                    value={expenseAccount}
                    onChange={e => setExpenseAccount(e.target.value)}
                    placeholder="t.ex. 6420"
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleBook}
                  disabled={booking || !expenseAccount}
                  className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {booking ? "Bokför…" : "Bokför i huvudboken"}
                </button>
              </div>
            )}

            {/* Pay */}
            {invoice.status === "booked" && !invoice.paidAt && (
              <>
                {!showPayForm ? (
                  <button
                    onClick={() => setShowPayForm(true)}
                    className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Markera som betald
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                    />
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                    >
                      <option value="bank_transfer">Bankgiro / Bank</option>
                      <option value="swish">Swish</option>
                      <option value="card">Kort</option>
                      <option value="cash">Kontant</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={handlePay} disabled={paying} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                        {paying ? "…" : "Bekräfta"}
                      </button>
                      <button onClick={() => setShowPayForm(false)} className="px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {invoice.status === "paid" && (
              <p className="text-sm text-emerald-700 font-medium text-center py-2">
                ✓ Betalad {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("sv-SE") : ""}
              </p>
            )}

            {invoice.journalId && (
              <p className="text-xs text-gray-400 text-center">
                Journal: <span className="font-mono">{invoice.journalId.slice(0, 8)}…</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: extracted fields */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-gray-500">FAKTURAINFORMATION</p>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? "Sparar…" : "Spara"}
                  </button>
                  <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                    Avbryt
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  Redigera
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Leverantör"          value={fields.supplierName      ?? ""} fieldKey="supplierName"      confidence={conf.supplierName}  editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="Org.nummer"           value={fields.supplierOrgNumber ?? ""} fieldKey="supplierOrgNumber" confidence={conf.supplierOrgNumber} editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="Fakturanummer"        value={fields.invoiceNumber     ?? ""} fieldKey="invoiceNumber"     confidence={conf.invoiceNumber}  editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="OCR-nummer"           value={fields.ocrNumber         ?? ""} fieldKey="ocrNumber"         confidence={conf.ocrNumber}      editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="Fakturadatum"         value={fields.invoiceDate       ?? ""} fieldKey="invoiceDate"       confidence={conf.invoiceDate}    editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="Förfallodatum"        value={fields.dueDate           ?? ""} fieldKey="dueDate"           confidence={conf.dueDate}        editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="Bankgiro"             value={fields.bankgiro          ?? ""} fieldKey="bankgiro"          confidence={conf.bankgiro}       editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="IBAN"                 value={fields.iban              ?? ""} fieldKey="iban"                                               editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
          </div>

          <hr className="my-4 border-gray-100" />

          <div className="grid grid-cols-3 gap-4">
            <Field label="Belopp ex moms" value={fields.amountExclVat ?? ""} fieldKey="amountExclVat" editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="Moms"           value={fields.vatAmount     ?? ""} fieldKey="vatAmount"     confidence={conf.vatAmount}    editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
            <Field label="Totalt ink moms" value={fields.amountInclVat ?? ""} fieldKey="amountInclVat" confidence={conf.amountInclVat} editing={editing} onChange={(k,v) => setFields(f => ({...f,[k]:v}))} />
          </div>

          {/* Confidence legend */}
          {invoice.aiConfidence && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
              <span>AI-konfidens:</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Hög (&ge;95%)</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1" />Osäker (70–94%)</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />Låg (&lt;70%)</span>
            </div>
          )}

          {/* Tasks */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <TaskWidget
              orgSlug={orgSlug}
              entityType="supplier_invoice"
              entityId={id}
              entityLabel={invoice.invoiceNumber
                ? `Lev.faktura ${invoice.invoiceNumber}`
                : invoice.supplierName ?? "Leverantörsfaktura"
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const COLOR: Record<string, string> = {
    draft:        "bg-gray-100 text-gray-600",
    extracting:   "bg-blue-100 text-blue-700",
    needs_review: "bg-yellow-100 text-yellow-800",
    approved:     "bg-indigo-100 text-indigo-700",
    booked:       "bg-green-100 text-green-700",
    paid:         "bg-emerald-100 text-emerald-700",
    rejected:     "bg-red-100 text-red-600",
  }
  const LABEL: Record<string, string> = {
    draft: "Utkast", extracting: "Analyseras", needs_review: "Granska",
    approved: "Godkänd", booked: "Bokförd", paid: "Betald", rejected: "Avvisad",
  }
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
      {LABEL[status] ?? status}
    </span>
  )
}
