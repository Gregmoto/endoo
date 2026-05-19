"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/StatusBadge"

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountManager = { id: string; fullName: string; email: string }
type PriceList      = { id: string; name: string }
type DeliveryMethod = { id: string; name: string }
type DeliveryTerms  = { id: string; name: string }

type Customer = {
  id:            string
  name:          string
  customerType:  string
  customerNumber: string | null
  status:        string
  email:         string | null
  phone:         string | null
  phone2:        string | null
  fax:           string | null
  countryCode:   string | null
  website:       string | null
  vatNumber:     string | null
  orgNumber:     string | null
  personalNumber: string | null
  addressLine1:  string | null
  addressLine2:  string | null
  city:          string | null
  postalCode:    string | null
  country:       string
  deliveryLine1:      string | null
  deliveryLine2:      string | null
  deliveryCity:       string | null
  deliveryPostalCode: string | null
  deliveryCountry:    string | null
  visitingLine1:      string | null
  visitingLine2:      string | null
  visitingPostalCode: string | null
  visitingCity:       string | null
  visitingCountry:    string | null
  defaultCurrency:         string | null
  defaultPaymentTermsDays: number | null
  deliveryTermsId:         string | null
  deliveryMethodId:        string | null
  interestInvoicing:       boolean
  priceListId:             string | null
  invoiceDiscountRate:     string | null
  invoiceFeeAmount:        number | null
  freightAmount:           number | null
  pricesIncludeVat:        boolean
  customerReference:  string | null
  ourReference:       string | null
  accountManagerId:   string | null
  externalReference:  string | null
  yourReferenceLabel: string | null
  defaultVatType:       string | null
  salesAccountOverride: string | null
  invoiceEmails:   string | null
  invoiceFreeText: string | null
  internalNotes:   string | null
  notes:           string | null
  totalRevenueOre:    number
  openInvoicesCount:  number
  openInvoicesAmount: number
  createdAt: string
  updatedAt: string
  accountManager: AccountManager | null
  priceList:      PriceList      | null
  deliveryMethod: DeliveryMethod | null
  deliveryTerms:  DeliveryTerms  | null
  _count: { invoices: number }
}

type TransactionInvoice = {
  id:            string
  invoiceNumber: string | null
  type:          string
  status:        string
  issueDate:     string
  dueDate:       string | null
  totalAmount:   number
  paidAmount:    number
  currency:      string
}

type TransactionSummary = {
  count:         number
  totalAmount:   number
  unpaidAmount:  number
  avgPaymentDays: number | null
}

type ActivityEntry = {
  id:         string
  action:     string
  entityType: string
  entityId:   string
  before:     Record<string, unknown> | null
  after:      Record<string, unknown> | null
  createdAt:  string
  user:       { fullName: string; email: string } | null
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: "general",      label: "Allmän information" },
  { key: "delivery",     label: "Leverans & Besök" },
  { key: "notes",        label: "Anteckningar" },
  { key: "invoice-data", label: "Fakturadata" },
  { key: "references",   label: "Referenser" },
  { key: "accounting",   label: "Bokföring" },
  { key: "email",        label: "E-post" },
  { key: "invoice-text", label: "Fakturatext" },
  { key: "transactions", label: "Transaktioner" },
  { key: "activity",     label: "Aktivitet" },
] as const

type TabKey = (typeof TABS)[number]["key"]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const params = useParams<{ orgSlug: string; id: string }>()
  const { orgSlug, id } = params

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<TabKey>("general")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setCustomer(data); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>
  if (!customer) return <div className="p-8 text-sm text-destructive">Kunden hittades inte.</div>

  const totalRevenue = customer.totalRevenueOre / 100

  return (
    <div className="p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${orgSlug}/customers`} className="hover:text-foreground">Kunder</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{customer.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            {customer.customerNumber && (
              <span className="font-mono text-sm text-muted-foreground">{customer.customerNumber}</span>
            )}
            <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
            <StatusBadge status={customer.status} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
            {(customer.city || customer.country) && (
              <span>{[customer.city, customer.country].filter(Boolean).join(", ")}</span>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="hover:text-foreground">{customer.email}</a>
            )}
            {customer.phone && <span>{customer.phone}</span>}
          </div>
          <div className="flex items-center gap-6 mt-2 text-sm">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{customer._count.invoices}</span> fakturor
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{fmtAmount(totalRevenue)} kr</span> omsättning
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/invoices/new?contactId=${customer.id}`}>
            <Button size="sm">Skapa faktura</Button>
          </Link>
          <Link href={`/${orgSlug}/customers/${customer.id}/edit`}>
            <Button variant="outline" size="sm">Redigera</Button>
          </Link>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Fler alternativ"
            >
              ⋮
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border rounded-lg shadow-lg py-1 w-44 text-sm">
                  <button className="w-full text-left px-4 py-2 hover:bg-accent text-foreground" onClick={() => setMenuOpen(false)}>
                    Skapa offert
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-accent text-muted-foreground" onClick={() => setMenuOpen(false)}>
                    Arkivera
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-accent text-destructive" onClick={() => setMenuOpen(false)}>
                    Ta bort
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-0.5 mb-6 border-b border overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "general"      && <GeneralTab      customer={customer} />}
      {tab === "delivery"     && <DeliveryTab     customer={customer} />}
      {tab === "notes"        && <NotesTab        customer={customer} onSaved={setCustomer} />}
      {tab === "invoice-data" && <InvoiceDataTab  customer={customer} />}
      {tab === "references"   && <ReferencesTab   customer={customer} />}
      {tab === "accounting"   && <AccountingTab   customer={customer} />}
      {tab === "email"        && <EmailTab        customer={customer} />}
      {tab === "invoice-text" && <InvoiceTextTab  customer={customer} />}
      {tab === "transactions" && <TransactionsTab customerId={id} orgSlug={orgSlug} />}
      {tab === "activity"     && <ActivityTab     customerId={id} />}
    </div>
  )
}

// ─── Tab 1: Allmän information ────────────────────────────────────────────────

function GeneralTab({ customer }: { customer: Customer }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Grunduppgifter</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <InfoRow label="Kundnummer"  value={customer.customerNumber} />
            <InfoRow label="Kundtyp"     value={customer.customerType === "business" ? "Företag" : "Privatperson"} />
            {customer.customerType === "business"
              ? <InfoRow label="Org.nummer" value={customer.orgNumber} />
              : <InfoRow label="Personnummer" value={customer.personalNumber} />
            }
            <InfoRow label="VAT-nummer"  value={customer.vatNumber} />
            <InfoRow label="Namn"        value={customer.name} />
            <InfoRow label="E-post"      value={customer.email} />
            <InfoRow label="Telefon"     value={customer.phone} />
            <InfoRow label="Telefon 2"   value={customer.phone2} />
            <InfoRow label="Fax"         value={customer.fax} />
            <InfoRow label="Webbadress"  value={customer.website} link />
            <InfoRow label="Status"      value={customer.status === "active" ? "Aktiv" : customer.status} />
            <InfoRow label="Landskod"    value={customer.countryCode} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fakturaadress</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <InfoRow label="Adressrad 1" value={customer.addressLine1} />
            <InfoRow label="Adressrad 2" value={customer.addressLine2} />
            <InfoRow label="Postnummer"  value={customer.postalCode} />
            <InfoRow label="Stad"        value={customer.city} />
            <InfoRow label="Land"        value={customer.country} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tidsstämplar</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <InfoRow label="Skapad"     value={fmtDateTime(customer.createdAt)} />
            <InfoRow label="Uppdaterad" value={fmtDateTime(customer.updatedAt)} />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 2: Leverans & Besök ──────────────────────────────────────────────────

function DeliveryTab({ customer }: { customer: Customer }) {
  const hasDelivery = !!(customer.deliveryLine1 || customer.deliveryCity)
  const hasVisiting = !!(customer.visitingLine1 || customer.visitingCity)

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Leveransadress</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-0.5">
          {hasDelivery ? (
            <>
              {customer.deliveryLine1 && <p className="text-foreground">{customer.deliveryLine1}</p>}
              {customer.deliveryLine2 && <p>{customer.deliveryLine2}</p>}
              {(customer.deliveryPostalCode || customer.deliveryCity) && (
                <p>{[customer.deliveryPostalCode, customer.deliveryCity].filter(Boolean).join(" ")}</p>
              )}
              {customer.deliveryCountry && <p>{customer.deliveryCountry}</p>}
            </>
          ) : (
            <p className="italic">Samma som fakturaadress</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Besöksadress</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-0.5">
          {hasVisiting ? (
            <>
              {customer.visitingLine1 && <p className="text-foreground">{customer.visitingLine1}</p>}
              {customer.visitingLine2 && <p>{customer.visitingLine2}</p>}
              {(customer.visitingPostalCode || customer.visitingCity) && (
                <p>{[customer.visitingPostalCode, customer.visitingCity].filter(Boolean).join(" ")}</p>
              )}
              {customer.visitingCountry && <p>{customer.visitingCountry}</p>}
            </>
          ) : (
            <p className="italic">Samma som fakturaadress</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 3: Anteckningar ──────────────────────────────────────────────────────

function NotesTab({ customer, onSaved }: { customer: Customer; onSaved: (c: Customer) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(customer.internalNotes ?? "")
  const [saving,  setSaving]  = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/customers/${customer.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ internalNotes: draft || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      onSaved({ ...customer, ...updated })
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Interna anteckningar</CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Redigera</Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground resize-none"
              placeholder="Skriv anteckningar om kunden…"
            />
            <div className="flex gap-2">
              <Button size="sm" loading={saving} onClick={save}>Spara</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraft(customer.internalNotes ?? "") }}>
                Avbryt
              </Button>
            </div>
          </div>
        ) : customer.internalNotes ? (
          <div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{customer.internalNotes}</p>
            <p className="mt-3 text-xs text-muted-foreground">Uppdaterad {fmtDate(customer.updatedAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Inga anteckningar ännu.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tab 4: Fakturadata ───────────────────────────────────────────────────────

function InvoiceDataTab({ customer }: { customer: Customer }) {
  return (
    <Card>
      <CardHeader><CardTitle>Fakturainställningar</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <InfoRow
            label="Betalningsvillkor"
            value={customer.defaultPaymentTermsDays != null
              ? `${customer.defaultPaymentTermsDays} dagar`
              : "Org.standard"}
          />
          <InfoRow
            label="Leveransvillkor"
            value={customer.deliveryTerms?.name ?? null}
          />
          <InfoRow
            label="Leveranssätt"
            value={customer.deliveryMethod?.name ?? null}
          />
          <div>
            <dt className="text-xs text-muted-foreground">Räntefakturering</dt>
            <dd className="mt-0.5">
              <StatusBadge
                status={customer.interestInvoicing ? "active" : "inactive"}
                label={customer.interestInvoicing ? "Ja" : "Nej"}
              />
            </dd>
          </div>
          <InfoRow label="Prislista"  value={customer.priceList?.name ?? null} />
          <InfoRow label="Valuta"     value={customer.defaultCurrency} />
          <InfoRow
            label="Fakturarabatt"
            value={customer.invoiceDiscountRate != null
              ? `${(parseFloat(String(customer.invoiceDiscountRate)) * 100).toFixed(2)}%`
              : null}
          />
          <InfoRow
            label="Fakturaavgift"
            value={customer.invoiceFeeAmount != null
              ? `${fmtAmount(customer.invoiceFeeAmount / 100)} kr`
              : null}
          />
          <InfoRow
            label="Fraktavgift"
            value={customer.freightAmount != null
              ? `${fmtAmount(customer.freightAmount / 100)} kr`
              : null}
          />
          <div>
            <dt className="text-xs text-muted-foreground">Priser inkl. moms</dt>
            <dd className="mt-0.5">
              <StatusBadge
                status={customer.pricesIncludeVat ? "active" : "inactive"}
                label={customer.pricesIncludeVat ? "Ja" : "Nej"}
              />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

// ─── Tab 5: Referenser ────────────────────────────────────────────────────────

function ReferencesTab({ customer }: { customer: Customer }) {
  const initials = customer.accountManager
    ? customer.accountManager.fullName
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null

  return (
    <Card>
      <CardHeader><CardTitle>Referenser</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <InfoRow label="Vår referens"         value={customer.ourReference} />
          <div>
            <dt className="text-xs text-muted-foreground">Kundansvarig</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              {customer.accountManager ? (
                <>
                  {initials && (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </span>
                  )}
                  <span className="text-foreground">{customer.accountManager.fullName}</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </div>
          <InfoRow label="Extern referens"       value={customer.externalReference} />
          <InfoRow label="Er referens-etikett"   value={customer.yourReferenceLabel} />
          <InfoRow label="Kundreferens"           value={customer.customerReference} />
        </dl>
      </CardContent>
    </Card>
  )
}

// ─── Tab 6: Bokföring ─────────────────────────────────────────────────────────

function AccountingTab({ customer }: { customer: Customer }) {
  const [viesLoading, setViesLoading] = useState(false)
  const [viesResult,  setViesResult]  = useState<{ valid: boolean; name?: string; address?: string } | null>(null)

  async function checkVies() {
    if (!customer.vatNumber) return
    setViesLoading(true)
    setViesResult(null)
    try {
      const res = await fetch("/api/integrations/vies/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ vatNumber: customer.vatNumber }),
      })
      if (res.ok) {
        setViesResult(await res.json())
      } else {
        setViesResult({ valid: false })
      }
    } catch {
      setViesResult({ valid: false })
    }
    setViesLoading(false)
  }

  return (
    <Card>
      <CardHeader><CardTitle>Bokföringsinställningar</CardTitle></CardHeader>
      <CardContent>
        <dl className="space-y-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground mb-1">VAT-nummer</dt>
            <dd className="flex items-center gap-3 flex-wrap">
              <span className="text-foreground">{customer.vatNumber ?? "—"}</span>
              {customer.vatNumber && (
                <Button variant="outline" size="sm" loading={viesLoading} onClick={checkVies}>
                  Verifiera mot VIES
                </Button>
              )}
              {viesResult && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  viesResult.valid
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}>
                  {viesResult.valid ? "Giltigt" : "Ogiltigt"}
                </span>
              )}
              {viesResult?.valid && viesResult.name && (
                <span className="text-xs text-muted-foreground">{viesResult.name}</span>
              )}
            </dd>
            {viesResult?.valid && viesResult.address && (
              <p className="mt-1 text-xs text-muted-foreground">{viesResult.address}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Momstyp override"      value={customer.defaultVatType} />
            <InfoRow label="Försäljningskonto"     value={customer.salesAccountOverride} />
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

// ─── Tab 7: E-post ────────────────────────────────────────────────────────────

function EmailTab({ customer }: { customer: Customer }) {
  const extraEmails = customer.invoiceEmails
    ? customer.invoiceEmails.split(",").map(e => e.trim()).filter(Boolean)
    : []

  return (
    <Card>
      <CardHeader><CardTitle>E-postinställningar</CardTitle></CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground mb-1">Huvud-e-post</dt>
          <dd className="text-foreground">
            {customer.email
              ? <a href={`mailto:${customer.email}`} className="text-primary hover:underline">{customer.email}</a>
              : <span className="text-muted-foreground">—</span>
            }
          </dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground mb-2">Ytterligare mottagare</dt>
          <dd>
            {extraEmails.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extraEmails.map(e => (
                  <span key={e} className="px-2.5 py-1 bg-muted text-foreground rounded-full text-xs border">{e}</span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic">Inga extra mottagare</span>
            )}
          </dd>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Tab 8: Fakturatext ───────────────────────────────────────────────────────

function InvoiceTextTab({ customer }: { customer: Customer }) {
  return (
    <Card>
      <CardHeader><CardTitle>Standardfakturatext</CardTitle></CardHeader>
      <CardContent>
        {customer.invoiceFreeText ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{customer.invoiceFreeText}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Ingen standardtext angiven</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tab 9: Transaktioner ─────────────────────────────────────────────────────

function TransactionsTab({ customerId, orgSlug }: { customerId: string; orgSlug: string }) {
  const [invoices,   setInvoices]   = useState<TransactionInvoice[]>([])
  const [summary,    setSummary]    = useState<TransactionSummary | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 })
  const [loading,    setLoading]    = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [fromDate,     setFromDate]     = useState("")
  const [toDate,       setToDate]       = useState("")

  const load = useCallback((page = 1) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), limit: "25" })
    if (statusFilter) qs.set("status", statusFilter)
    if (fromDate)     qs.set("from", fromDate)
    if (toDate)       qs.set("to", toDate)
    fetch(`/api/customers/${customerId}/transactions?${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setInvoices(data.invoices)
          setSummary(data.summary)
          setPagination(data.pagination)
        }
        setLoading(false)
      })
  }, [customerId, statusFilter, fromDate, toDate])

  useEffect(() => { load(1) }, [load])

  const totalInvoiced = summary ? fmtAmount(summary.totalAmount / 100) : "—"
  const totalUnpaid   = summary ? fmtAmount(summary.unpaidAmount / 100) : "—"

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Totalt fakturor",    value: summary ? String(summary.count) : "—" },
          { label: "Fakturerat",         value: summary ? `${totalInvoiced} kr` : "—" },
          { label: "Obetalt",            value: summary ? `${totalUnpaid} kr` : "—" },
          { label: "Snittbetalningstid", value: summary?.avgPaymentDays != null ? `${summary.avgPaymentDays} dagar` : "—" },
        ].map(card => (
          <Card key={card.label}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none"
          >
            <option value="">Alla</option>
            <option value="draft">Utkast</option>
            <option value="sent">Skickad</option>
            <option value="paid">Betald</option>
            <option value="overdue">Förfallen</option>
            <option value="partial">Delbetalad</option>
            <option value="void">Makulerad</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Från</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Till</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Laddar…</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Inga fakturor hittades.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Fakturanr</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Typ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Förfall</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Saldo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-t border-border/50 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/${orgSlug}/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                          {inv.invoiceNumber ?? "Utkast"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">{inv.type}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.issueDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.dueDate ? fmtDate(inv.dueDate) : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {fmtAmount(inv.totalAmount / 100)} {inv.currency}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {fmtAmount((inv.totalAmount - inv.paidAmount) / 100)} {inv.currency}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Summary footer */}
        {!loading && summary && (
          <div className="px-4 py-3 border-t border text-xs text-muted-foreground">
            Totalt: {pagination.total} fakturor
            {" · "}{fmtAmount(summary.totalAmount / 100)} kr fakturerat
            {" · "}{fmtAmount(summary.unpaidAmount / 100)} kr obetalt
          </div>
        )}
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
          >
            Föregående
          </Button>
          <span className="text-sm text-muted-foreground">
            Sida {pagination.page} av {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => load(pagination.page + 1)}
          >
            Nästa
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Tab 10: Aktivitet ────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, { bg: string; icon: string }> = {
  create: { bg: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: "+" },
  update: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",    icon: "✎" },
  delete: { bg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",        icon: "×" },
  send:   { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: "✉" },
}

function ActivityTab({ customerId }: { customerId: string }) {
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(false)

  const load = useCallback((p: number) => {
    setLoading(true)
    fetch(`/api/customers/${customerId}/activity?page=${p}`)
      .then(r => r.ok ? r.json() : { activity: [] })
      .then(data => {
        if (p === 1) setActivity(data.activity ?? [])
        else setActivity(prev => [...prev, ...(data.activity ?? [])])
        setHasMore((data.activity ?? []).length >= 50)
        setLoading(false)
      })
  }, [customerId])

  useEffect(() => { load(1) }, [load])

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next)
  }

  function describeAction(entry: ActivityEntry) {
    const entityLabel = entry.entityType === "Invoice" ? "Faktura" : "Kontakt"
    const invNum = (entry.after as Record<string, string> | null)?.invoiceNumber
      || (entry.before as Record<string, string> | null)?.invoiceNumber
    const prefix = invNum ? `${entityLabel} ${invNum}` : entityLabel

    if (entry.action === "create") return `${prefix} skapad`
    if (entry.action === "delete") return `${prefix} borttagen`
    if (entry.action === "send")   return `${prefix} skickad`
    if (entry.action === "update") {
      const changedFields = [
        ...Object.keys(entry.after ?? {}),
        ...Object.keys(entry.before ?? {}),
      ].filter((v, i, a) => a.indexOf(v) === i)
      if (changedFields.length > 0) {
        return `Fält ändrade: ${changedFields.join(", ")}`
      }
      return `${prefix} uppdaterad`
    }
    return `${entityLabel}: ${entry.action}`
  }

  return (
    <div className="space-y-4">
      {loading && activity.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Laddar…</div>
      ) : activity.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Ingen aktivitet registrerad.</div>
      ) : (
        <div className="space-y-3">
          {activity.map(entry => {
            const style = ACTION_ICONS[entry.action] ?? ACTION_ICONS.update
            return (
              <div key={entry.id} className="flex items-start gap-3">
                <span className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${style.bg}`}>
                  {style.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{describeAction(entry)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.user ? `${entry.user.fullName} · ` : ""}
                    {fmtDateTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && !loading && (
        <Button variant="outline" size="sm" onClick={loadMore}>
          Visa fler
        </Button>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function InfoRow({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground mt-0.5">
        {value
          ? link
            ? <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a>
            : value
          : <span className="text-muted-foreground">—</span>
        }
      </dd>
    </div>
  )
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("sv-SE")
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
}

function fmtAmount(v: number) {
  return v.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
