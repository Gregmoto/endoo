"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TaskWidget } from "@/components/tasks/TaskWidget"

// ─── Types ───────────────────────────────────────────────────────────────────

type ContactPerson = {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  isPrimary: boolean
  isInvoiceContact: boolean
}

type Contact = {
  id: string
  name: string
  type: "business" | "individual"
  status: "active" | "inactive" | "blocked" | "ended" | "test"
  customerNumber: string | null
  email: string | null
  phone: string | null
  website: string | null
  orgNumber: string | null
  vatNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  postalCode: string | null
  country: string
  deliveryLine1: string | null
  deliveryLine2: string | null
  deliveryCity: string | null
  deliveryPostalCode: string | null
  deliveryCountry: string | null
  defaultCurrency: string | null
  defaultPaymentTermsDays: number | null
  customerReference: string | null
  notes: string | null
  internalNotes: string | null
  createdAt: string
  contactPersons: ContactPerson[]
  _count: { invoices: number }
}

type Invoice = {
  id: string
  invoiceNumber: string | null
  status: string
  totalAmount: number
  currency: string
  issueDate: string
  dueDate: string | null
  paymentDate: string | null
}

type AuditEntry = {
  id: string
  action: string
  entityType: string
  createdAt: string
  user: { fullName: string; email: string } | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:   { label: "Aktiv",    cls: "bg-green-100 text-green-700" },
  inactive: { label: "Inaktiv",  cls: "bg-muted text-muted-foreground" },
  blocked:  { label: "Blockerad",cls: "bg-red-100 text-red-700" },
  ended:    { label: "Avslutad", cls: "bg-orange-100 text-orange-700" },
  test:     { label: "Test",     cls: "bg-purple-100 text-purple-700" },
}

const INVOICE_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Utkast",   cls: "bg-muted text-muted-foreground" },
  sent:     { label: "Skickad",  cls: "bg-blue-100 text-blue-700" },
  paid:     { label: "Betald",   cls: "bg-green-100 text-green-700" },
  overdue:  { label: "Förfallen",cls: "bg-red-100 text-red-700" },
  cancelled:{ label: "Makulerad",cls: "bg-orange-100 text-orange-700" },
}

const inputCls = "w-full px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContactDetailPage() {
  const params = useParams<{ orgSlug: string; id: string }>()
  const { orgSlug, id } = params

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"profile" | "persons" | "history">("profile")

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setContact(data); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>
  if (!contact) return <div className="p-8 text-sm text-red-500">Kontakten hittades inte.</div>

  const s = STATUS_LABELS[contact.status] ?? STATUS_LABELS.active

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb + header */}
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${orgSlug}/contacts`} className="hover:text-foreground">Kunder</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">{contact.name}</span>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${s.cls}`}>{s.label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {contact.customerNumber && <span className="font-mono mr-3">{contact.customerNumber}</span>}
            {contact.type === "business" ? "Företag" : "Privatperson"}
            {contact.orgNumber && <span className="ml-3 text-muted-foreground">Org.nr: {contact.orgNumber}</span>}
          </p>
        </div>
        <Link href={`/${orgSlug}/invoices/new?contactId=${contact.id}`}>
          <Button size="sm">+ Ny faktura</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border">
        {(["profile", "persons", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "profile" ? "Profil" : t === "persons" ? `Kontaktpersoner (${contact.contactPersons.length})` : "Historik"}
          </button>
        ))}
      </div>

      {tab === "profile"  && <ProfileTab contact={contact} onSaved={setContact} orgSlug={orgSlug} />}
      {tab === "persons"  && <PersonsTab contactId={id} initialPersons={contact.contactPersons} />}
      {tab === "history"  && <HistoryTab contactId={id} orgSlug={orgSlug} />}
    </div>
  )
}

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab({ contact, onSaved, orgSlug }: { contact: Contact; onSaved: (c: Contact) => void; orgSlug: string }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState<Partial<Contact>>(contact)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState("")

  const set = (k: keyof Contact) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value || null }))

  async function save() {
    setSaving(true)
    setError("")
    const payload = {
      ...form,
      defaultPaymentTermsDays: form.defaultPaymentTermsDays
        ? parseInt(String(form.defaultPaymentTermsDays))
        : null,
    }
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const updated = await res.json()
      onSaved({ ...contact, ...updated })
      setEditing(false)
    } else {
      const d = await res.json()
      setError(d.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle>Kontaktuppgifter</CardTitle>
            <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Redigera
            </button>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <InfoRow label="E-post"   value={contact.email} />
              <InfoRow label="Telefon"  value={contact.phone} />
              <InfoRow label="Webbplats" value={contact.website} link />
              <InfoRow label="VAT-nummer" value={contact.vatNumber} />
            </dl>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Fakturaadress</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-0.5">
              {contact.addressLine1 && <p>{contact.addressLine1}</p>}
              {contact.addressLine2 && <p>{contact.addressLine2}</p>}
              {(contact.postalCode || contact.city) && (
                <p>{[contact.postalCode, contact.city].filter(Boolean).join(" ")}</p>
              )}
              {contact.country && <p className="text-muted-foreground">{contact.country}</p>}
              {!contact.addressLine1 && <p className="text-muted-foreground">Ingen adress angiven</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Leveransadress</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-0.5">
              {contact.deliveryLine1 && <p>{contact.deliveryLine1}</p>}
              {contact.deliveryLine2 && <p>{contact.deliveryLine2}</p>}
              {(contact.deliveryPostalCode || contact.deliveryCity) && (
                <p>{[contact.deliveryPostalCode, contact.deliveryCity].filter(Boolean).join(" ")}</p>
              )}
              {contact.deliveryCountry && <p className="text-muted-foreground">{contact.deliveryCountry}</p>}
              {!contact.deliveryLine1 && <p className="text-muted-foreground">Samma som fakturaadress</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Fakturering</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <InfoRow label="Valuta" value={contact.defaultCurrency} />
              <InfoRow
                label="Betalningsvillkor"
                value={contact.defaultPaymentTermsDays != null ? `${contact.defaultPaymentTermsDays} dagar` : null}
              />
              <InfoRow label="Er referens" value={contact.customerReference} />
              <InfoRow label="Fakturor" value={String(contact._count.invoices)} />
            </dl>
          </CardContent>
        </Card>

        {contact.notes && (
          <Card>
            <CardHeader><CardTitle>Anteckningar</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Uppgifter</CardTitle></CardHeader>
          <CardContent>
            <TaskWidget
              orgSlug={orgSlug}
              entityType="contact"
              entityId={contact.id}
              entityLabel={contact.name}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Edit mode
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Redigera profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Typ">
              <select value={form.type} onChange={set("type") as React.ChangeEventHandler<HTMLSelectElement>} className={inputCls}>
                <option value="business">Företag</option>
                <option value="individual">Privatperson</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set("status") as React.ChangeEventHandler<HTMLSelectElement>} className={inputCls}>
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
                <option value="blocked">Blockerad</option>
                <option value="ended">Avslutad</option>
                <option value="test">Test</option>
              </select>
            </Field>
          </div>
          <Field label="Namn">
            <input value={form.name ?? ""} onChange={set("name")} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-post">
              <input type="email" value={form.email ?? ""} onChange={set("email")} className={inputCls} />
            </Field>
            <Field label="Telefon">
              <input value={form.phone ?? ""} onChange={set("phone")} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Org.nummer">
              <input value={form.orgNumber ?? ""} onChange={set("orgNumber")} className={inputCls} />
            </Field>
            <Field label="VAT-nummer">
              <input value={form.vatNumber ?? ""} onChange={set("vatNumber")} className={inputCls} />
            </Field>
          </div>
          <Field label="Webbplats">
            <input value={form.website ?? ""} onChange={set("website")} className={inputCls} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fakturaadress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Rad 1"><input value={form.addressLine1 ?? ""} onChange={set("addressLine1")} className={inputCls} /></Field>
          <Field label="Rad 2"><input value={form.addressLine2 ?? ""} onChange={set("addressLine2")} className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Postnummer">
              <input value={form.postalCode ?? ""} onChange={set("postalCode")} className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Stad"><input value={form.city ?? ""} onChange={set("city")} className={inputCls} /></Field>
            </div>
          </div>
          <Field label="Land (ISO 2)">
            <input value={form.country ?? "SE"} onChange={set("country")} maxLength={2} className={inputCls} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leveransadress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Rad 1"><input value={form.deliveryLine1 ?? ""} onChange={set("deliveryLine1")} className={inputCls} /></Field>
          <Field label="Rad 2"><input value={form.deliveryLine2 ?? ""} onChange={set("deliveryLine2")} className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Postnummer">
              <input value={form.deliveryPostalCode ?? ""} onChange={set("deliveryPostalCode")} className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Stad"><input value={form.deliveryCity ?? ""} onChange={set("deliveryCity")} className={inputCls} /></Field>
            </div>
          </div>
          <Field label="Land (ISO 2)">
            <input value={form.deliveryCountry ?? ""} onChange={set("deliveryCountry")} maxLength={2} className={inputCls} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fakturering</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valuta">
              <input value={form.defaultCurrency ?? ""} onChange={set("defaultCurrency")} maxLength={3} className={inputCls} />
            </Field>
            <Field label="Betalningsvillkor (dagar)">
              <input
                type="number"
                min={0}
                value={form.defaultPaymentTermsDays ?? ""}
                onChange={set("defaultPaymentTermsDays")}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Er referens">
            <input value={form.customerReference ?? ""} onChange={set("customerReference")} className={inputCls} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Anteckningar</CardTitle></CardHeader>
        <CardContent>
          <textarea
            value={form.notes ?? ""}
            onChange={set("notes")}
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={save} loading={saving}>Spara</Button>
        <Button variant="outline" onClick={() => { setEditing(false); setForm(contact) }}>Avbryt</Button>
      </div>
    </div>
  )
}

// ─── Persons tab ─────────────────────────────────────────────────────────────

function PersonsTab({ contactId, initialPersons }: { contactId: string; initialPersons: ContactPerson[] }) {
  const [persons, setPersons] = useState<ContactPerson[]>(initialPersons)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ name: "", role: "", email: "", phone: "", isPrimary: false, isInvoiceContact: false })
  const [error, setError]     = useState("")

  async function reload() {
    const r = await fetch(`/api/contacts/${contactId}/persons`)
    if (r.ok) setPersons(await r.json())
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch(`/api/contacts/${contactId}/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        email: form.email || null,
        phone: form.phone || null,
        role:  form.role  || null,
      }),
    })
    if (res.ok) {
      await reload()
      setForm({ name: "", role: "", email: "", phone: "", isPrimary: false, isInvoiceContact: false })
      setShowForm(false)
    } else {
      const d = await res.json()
      setError(d.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  async function deletePerson(personId: string) {
    if (!confirm("Ta bort kontaktpersonen?")) return
    await fetch(`/api/contacts/${contactId}/persons/${personId}`, { method: "DELETE" })
    await reload()
  }

  async function setPrimary(personId: string) {
    await fetch(`/api/contacts/${contactId}/persons/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    })
    await reload()
  }

  return (
    <div className="space-y-4">
      {persons.length === 0 && !showForm && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <p>Inga kontaktpersoner registrerade.</p>
        </div>
      )}

      {persons.map(p => (
        <Card key={p.id}>
          <CardContent className="py-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{p.name}</p>
                {p.isPrimary && (
                  <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">Primär</span>
                )}
                {p.isInvoiceContact && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Fakturakontakt</span>
                )}
              </div>
              {p.role && <p className="text-xs text-muted-foreground mt-0.5">{p.role}</p>}
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                {p.email && <span>{p.email}</span>}
                {p.phone && <span>{p.phone}</span>}
              </div>
            </div>
            <div className="flex gap-3">
              {!p.isPrimary && (
                <button onClick={() => setPrimary(p.id)} className="text-xs text-muted-foreground hover:text-indigo-600">
                  Sätt primär
                </button>
              )}
              <button onClick={() => deletePerson(p.id)} className="text-xs text-red-500 hover:text-red-700">
                Ta bort
              </button>
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <Card>
          <CardHeader><CardTitle>Lägg till kontaktperson</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addPerson} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Namn *">
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Roll / titel">
                  <input
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className={inputCls}
                    placeholder="VD, Ekonomichef…"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-post">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Telefon">
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))}
                    className="rounded"
                  />
                  Primär kontakt
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isInvoiceContact}
                    onChange={e => setForm(f => ({ ...f, isInvoiceContact: e.target.checked }))}
                    className="rounded"
                  />
                  Fakturakontakt
                </label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={saving}>Lägg till</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border rounded-xl text-sm text-muted-foreground hover:text-muted-foreground hover:border transition-colors"
        >
          + Lägg till kontaktperson
        </button>
      )}
    </div>
  )
}

// ─── History tab ─────────────────────────────────────────────────────────────

function HistoryTab({ contactId, orgSlug }: { contactId: string; orgSlug: string }) {
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [auditLogs, setAuditLogs]   = useState<AuditEntry[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetch(`/api/contacts/${contactId}/history`)
      .then(r => r.ok ? r.json() : { invoices: [], auditLogs: [] })
      .then(d => {
        setInvoices(d.invoices)
        setAuditLogs(d.auditLogs)
        setLoading(false)
      })
  }, [contactId])

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Laddar…</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Fakturor ({invoices.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">Inga fakturor ännu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Utfärdat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Förfaller</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Belopp</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const st = INVOICE_STATUS_LABELS[inv.status] ?? { label: inv.status, cls: "bg-muted text-muted-foreground" }
                  return (
                    <tr key={inv.id} className="border-t border-border/50 hover:bg-muted">
                      <td className="px-6 py-3">
                        <Link
                          href={`/${orgSlug}/invoices/${inv.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {inv.invoiceNumber ?? "Utkast"}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{fmtDate(inv.issueDate)}</td>
                      <td className="px-6 py-3 text-muted-foreground">{inv.dueDate ? fmtDate(inv.dueDate) : "—"}</td>
                      <td className="px-6 py-3 text-right text-foreground font-medium">
                        {fmtAmount(inv.totalAmount)} {inv.currency}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aktivitetslogg</CardTitle></CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga loggade händelser.</p>
          ) : (
            <ul className="space-y-3">
              {auditLogs.map(entry => (
                <li key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <div>
                    <span className="text-foreground">{entry.action}</span>
                    {entry.user && (
                      <span className="text-muted-foreground ml-2">av {entry.user.fullName}</span>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(entry.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
            ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{value}</a>
            : value
          : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
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
  return (v / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
