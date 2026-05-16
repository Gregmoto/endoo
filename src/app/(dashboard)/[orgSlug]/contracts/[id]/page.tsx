"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type Line = {
  id: string; description: string; quantity: number; unit: string
  unitPrice: number; taxRate: number; discountRate: number; sortOrder: number
}
type Invoice = {
  id: string; invoiceNumber: string; status: string; totalAmount: number; currency: string; issueDate: string
}
type Contact = { id: string; name: string; email: string | null }

type Contract = {
  id: string; contractNumber: string | null; name: string
  status: string; frequency: string
  startDate: string; endDate: string | null; nextIssueDate: string; lastIssuedAt: string | null
  currency: string; paymentTermsDays: number; autoSend: boolean
  reference: string | null; notes: string | null; internalNotes: string | null
  contact: Contact | null
  lines: Line[]
  invoices: Invoice[]
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Utkast",  cls: "bg-gray-100 text-gray-500" },
  active:    { label: "Aktivt",  cls: "bg-green-100 text-green-700" },
  paused:    { label: "Pausat",  cls: "bg-yellow-100 text-yellow-700" },
  ended:     { label: "Avslutat",cls: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Avbrutet",cls: "bg-red-100 text-red-700" },
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "Veckovis", biweekly: "Varannan vecka",
  monthly: "Månadsvis", quarterly: "Kvartalsvis", yearly: "Årsvis",
}

const INV_STATUS: Record<string, { label: string; cls: string }> = {
  draft:   { label: "Utkast",  cls: "bg-gray-100 text-gray-500" },
  sent:    { label: "Skickad", cls: "bg-blue-100 text-blue-700" },
  partial: { label: "Delbetald",cls:"bg-yellow-100 text-yellow-700" },
  paid:    { label: "Betald",  cls: "bg-green-100 text-green-700" },
  overdue: { label: "Förfallen",cls:"bg-red-100 text-red-700" },
  void:    { label: "Makulerad",cls:"bg-orange-100 text-orange-700" },
}

function fmtMoney(v: number, currency: string) {
  return `${(v / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContractDetailPage() {
  const params = useParams<{ orgSlug: string; id: string }>()
  const router = useRouter()
  const { orgSlug, id } = params

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState("")
  const [genSuccess, setGenSuccess] = useState("")

  useEffect(() => {
    fetch(`/api/contracts/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setContract(data); setLoading(false) })
  }, [id])

  function refresh() {
    fetch(`/api/contracts/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setContract(data))
  }

  async function generate() {
    setGenerating(true)
    setGenError("")
    setGenSuccess("")
    const res = await fetch(`/api/contracts/${id}/generate`, { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      setGenSuccess(`Faktura ${data.invoiceNumber} skapad`)
      refresh()
      setTimeout(() => setGenSuccess(""), 5000)
    } else {
      if (res.status === 409 && data.invoiceId) {
        setGenError(`Faktura redan genererad för denna period — öppna ${data.invoiceId}`)
      } else {
        setGenError(data.error ?? "Fel")
      }
    }
    setGenerating(false)
  }

  async function setStatus(newStatus: string) {
    const res = await fetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) refresh()
  }

  if (loading)   return <div className="p-8 text-sm text-gray-400">Laddar…</div>
  if (!contract) return <div className="p-8 text-sm text-red-500">Avtalet hittades inte.</div>

  const st = STATUS_LABELS[contract.status] ?? STATUS_LABELS.draft

  const periodTotal = contract.lines.reduce((s, l) => {
    const net = Number(l.quantity) * Number(l.unitPrice)
    return s + Math.round(net * (1 + Number(l.taxRate)))
  }, 0)

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/${orgSlug}/contracts`} className="hover:text-gray-700">Avtal</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{contract.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{contract.name}</h1>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${st.cls}`}>{st.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {contract.contractNumber && <span className="font-mono mr-3">{contract.contractNumber}</span>}
            {FREQ_LABELS[contract.frequency]}
            {contract.contact && (
              <span className="ml-3">
                · <Link href={`/${orgSlug}/contacts/${contract.contact.id}`} className="text-indigo-600 hover:underline">
                  {contract.contact.name}
                </Link>
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <Link href={`/${orgSlug}/contracts/${id}/edit`}>
            <Button size="sm" variant="outline">Redigera</Button>
          </Link>
          {/* Status transitions */}
          {contract.status === "draft" && (
            <Button size="sm" onClick={() => setStatus("active")}>Aktivera</Button>
          )}
          {contract.status === "active" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setStatus("paused")}>Pausa</Button>
              <Button
                size="sm"
                onClick={generate}
                loading={generating}
              >
                Generera faktura nu
              </Button>
            </>
          )}
          {contract.status === "paused" && (
            <>
              <Button size="sm" onClick={() => setStatus("active")}>Återaktivera</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("ended")}>Avsluta</Button>
            </>
          )}
          {["active", "paused"].includes(contract.status) && (
            <Button size="sm" variant="outline" onClick={() => setStatus("cancelled")}
              className="text-red-600 border-red-200 hover:bg-red-50">
              Avbryt avtal
            </Button>
          )}
        </div>
      </div>

      {genSuccess && (
        <div className="mb-4 px-4 py-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
          ✓ {genSuccess}
          <Link href={`/${orgSlug}/invoices`} className="ml-auto underline text-xs">Visa fakturor →</Link>
        </div>
      )}
      {genError && (
        <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-lg">{genError}</div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle>Schema</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <InfoRow label="Startdatum"       value={fmtDate(contract.startDate)} />
              <InfoRow label="Slutdatum"        value={fmtDate(contract.endDate)} />
              <InfoRow label="Betalningsvillkor" value={`${contract.paymentTermsDays} dagar`} />
              {contract.status === "active" && (
                <InfoRow label="Nästa faktura" value={fmtDate(contract.nextIssueDate)} />
              )}
              {contract.lastIssuedAt && (
                <InfoRow label="Senast genererat" value={fmtDate(contract.lastIssuedAt)} />
              )}
              <InfoRow label="Autoskicka" value={contract.autoSend ? "Ja" : "Nej"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summa per period</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {fmtMoney(periodTotal, contract.currency)}
            </p>
            <p className="text-sm text-gray-400 mt-1">inkl. moms</p>
            {contract.reference && (
              <p className="text-sm text-gray-500 mt-3">Ref: {contract.reference}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lines */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Avtalsrader</CardTitle></CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Beskrivning","Antal","Enhet","À-pris","Moms","Summa inkl.moms"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contract.lines.map(l => {
              const net   = Number(l.quantity) * Number(l.unitPrice)
              const total = Math.round(net * (1 + Number(l.taxRate)))
              return (
                <tr key={l.id} className="border-t border-gray-50">
                  <td className="px-4 py-3">{l.description}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{Number(l.quantity)}</td>
                  <td className="px-4 py-3 text-gray-500">{l.unit}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtMoney(l.unitPrice, contract.currency)}</td>
                  <td className="px-4 py-3 text-gray-500">{Math.round(Number(l.taxRate) * 100)}%</td>
                  <td className="px-4 py-3 font-medium tabular-nums text-right">{fmtMoney(total, contract.currency)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* Generated invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Genererade fakturor ({contract.invoices.length})</CardTitle>
            {contract.status === "active" && (
              <Button size="sm" onClick={generate} loading={generating}>Generera faktura nu</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {contract.invoices.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400">Inga fakturor genererade ännu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Fakturanr</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Datum</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500">Belopp</th>
                </tr>
              </thead>
              <tbody>
                {contract.invoices.map(inv => {
                  const s = INV_STATUS[inv.status] ?? INV_STATUS.draft
                  return (
                    <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-2.5">
                        <Link href={`/${orgSlug}/invoices/${inv.id}`}
                          className="font-medium font-mono text-indigo-600 hover:text-indigo-800">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-gray-500">{fmtDate(inv.issueDate)}</td>
                      <td className="px-5 py-2.5">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                        {fmtMoney(inv.totalAmount, inv.currency)}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
