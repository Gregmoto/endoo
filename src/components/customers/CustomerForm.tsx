"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { COUNTRIES } from "@/lib/data/countries"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerFormData {
  // Allmän
  customerNumber:    string
  customerType:      "business" | "individual"
  orgNumber:         string
  personalNumber:    string
  isArchived:        boolean
  name:              string
  addressLine1:      string
  addressLine2:      string
  postalCode:        string
  city:              string
  country:           string
  countryCode:       string
  phone:             string
  phone2:            string
  fax:               string
  email:             string
  website:           string
  // Leverans
  sameAsInvoice:     boolean
  deliveryLine1:     string
  deliveryLine2:     string
  deliveryPostalCode:string
  deliveryCity:      string
  deliveryCountry:   string
  visitSameAsInvoice:boolean
  visitingLine1:     string
  visitingLine2:     string
  visitingPostalCode:string
  visitingCity:      string
  visitingCountry:   string
  // Anteckningar
  internalNotes:     string
  // Fakturadata
  defaultPaymentTermsDays: string
  deliveryTermsId:   string
  deliveryMethodId:  string
  interestInvoicing: boolean
  priceListId:       string
  defaultCurrency:   string
  invoiceDiscountRate:string
  invoiceFeeAmount:  string
  freightAmount:     string
  pricesIncludeVat:  boolean
  // Referenser
  ourReference:      string
  accountManagerId:  string
  externalReference: string
  yourReferenceLabel:string
  customerReference: string
  // Bokföring
  vatNumber:         string
  defaultVatType:    string
  salesAccountOverride:string
  // E-post
  invoiceEmails:     string[]
  // Fakturatext
  invoiceFreeText:   string
}

interface Props {
  mode:         "new" | "edit"
  orgSlug:      string
  initialData?: Partial<CustomerFormData>
  customerId?:  string
  onSaved?:     (id: string) => void
}

const EMPTY: CustomerFormData = {
  customerNumber: "", customerType: "business", orgNumber: "", personalNumber: "",
  isArchived: false, name: "", addressLine1: "", addressLine2: "", postalCode: "",
  city: "", country: "SE", countryCode: "+46", phone: "", phone2: "", fax: "",
  email: "", website: "",
  sameAsInvoice: true, deliveryLine1: "", deliveryLine2: "", deliveryPostalCode: "",
  deliveryCity: "", deliveryCountry: "SE",
  visitSameAsInvoice: true, visitingLine1: "", visitingLine2: "", visitingPostalCode: "",
  visitingCity: "", visitingCountry: "SE",
  internalNotes: "",
  defaultPaymentTermsDays: "", deliveryTermsId: "", deliveryMethodId: "",
  interestInvoicing: false, priceListId: "", defaultCurrency: "SEK",
  invoiceDiscountRate: "", invoiceFeeAmount: "", freightAmount: "",
  pricesIncludeVat: false,
  ourReference: "", accountManagerId: "", externalReference: "",
  yourReferenceLabel: "Er referens", customerReference: "",
  vatNumber: "", defaultVatType: "", salesAccountOverride: "",
  invoiceEmails: [],
  invoiceFreeText: "",
}

const TABS = [
  "Allmän information",
  "Leverans & Besök",
  "Anteckningar",
  "Fakturadata",
  "Referenser",
  "Bokföring",
  "E-post",
  "Fakturatext",
]

const VAT_TYPES = [
  { value: "",             label: "— Välj —" },
  { value: "SE25",         label: "SE 25%" },
  { value: "SE12",         label: "SE 12%" },
  { value: "SE6",          label: "SE 6%" },
  { value: "EU_VAROR",     label: "EU Varor (0%)" },
  { value: "EU_TJANSTER",  label: "EU Tjänster (0%)" },
  { value: "EXPORT",       label: "Export (0%)" },
  { value: "NONE",         label: "Ingen moms" },
]

const CURRENCIES = [
  { value: "SEK", label: "SEK" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "NOK", label: "NOK" },
  { value: "DKK", label: "DKK" },
]

const DEFAULT_PAYMENT_DAYS = [
  { value: "",   label: "— Välj —" },
  { value: "0",  label: "0 dagar" },
  { value: "10", label: "10 dagar" },
  { value: "14", label: "14 dagar" },
  { value: "20", label: "20 dagar" },
  { value: "30", label: "30 dagar" },
  { value: "45", label: "45 dagar" },
  { value: "60", label: "60 dagar" },
  { value: "90", label: "90 dagar" },
]

type PaymentTerm = { id: string; name: string; days: number }
type DeliveryOption = { id: string; name: string }

const inputCls =
  "block w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? "col-span-1" : ""}>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={e => (e.key === " " || e.key === "Enter") && onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}

function EmailChips({
  values,
  onChange,
}: {
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState("")

  function add() {
    const trimmed = input.trim().replace(/,$/, "")
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput("")
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 min-h-[44px] rounded-lg border border-input bg-card">
      {values.map(v => (
        <span key={v} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-muted text-foreground">
          {v}
          <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="text-muted-foreground hover:text-destructive leading-none">×</button>
        </span>
      ))}
      <input
        type="email"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), add())}
        onBlur={add}
        placeholder="Lägg till e-post…"
        className="flex-1 min-w-[200px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomerForm({ mode, orgSlug, initialData, customerId, onSaved }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState<CustomerFormData>(() => ({ ...EMPTY, ...initialData }))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [viesLoading, setViesLoading] = useState(false)
  const [viesResult, setViesResult] = useState<string | null>(null)
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryOption[]>([])
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOption[]>([])
  const [priceLists, setPriceLists] = useState<DeliveryOption[]>([])
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const DRAFT_KEY = "customer_draft_new"

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      const [ptRes, dtRes, dmRes, plRes] = await Promise.allSettled([
        fetch("/api/settings/payment-terms").then(r => r.json()),
        fetch("/api/settings/delivery-terms").then(r => r.json()),
        fetch("/api/settings/delivery-methods").then(r => r.json()),
        fetch("/api/settings/price-lists").then(r => r.json()),
      ])
      if (ptRes.status === "fulfilled" && Array.isArray(ptRes.value)) setPaymentTerms(ptRes.value)
      if (dtRes.status === "fulfilled" && Array.isArray(dtRes.value)) setDeliveryTerms(dtRes.value)
      if (dmRes.status === "fulfilled" && Array.isArray(dmRes.value)) setDeliveryMethods(dmRes.value)
      if (plRes.status === "fulfilled" && Array.isArray(plRes.value)) setPriceLists(plRes.value)
    }
    loadSettings()
  }, [])

  // Load draft on mount (new mode)
  useEffect(() => {
    if (mode !== "new") return
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        const parsed = JSON.parse(draft) as Partial<CustomerFormData>
        setForm(f => ({ ...f, ...parsed }))
      }
    } catch {}
  }, [mode])

  // Autosave draft
  useEffect(() => {
    if (mode !== "new") return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch {}
    }, 30000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [form, mode])

  function set<K extends keyof CustomerFormData>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setForm(f => {
        const next = { ...f, [k]: value }
        if (k === "country") {
          const c = COUNTRIES.find(x => x.code === value)
          if (c) next.countryCode = c.dialCode
        }
        return next
      })
    }
  }

  function setBool<K extends keyof CustomerFormData>(k: K) {
    return (v: boolean) => setForm(f => ({ ...f, [k]: v }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Namn är obligatoriskt"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) { setTab(0); return }
    setSaving(true)
    setServerError("")

    const payload = {
      name:             form.name,
      type:             form.customerType,
      status:           form.isArchived ? "inactive" : "active",
      customerNumber:   form.customerNumber || null,
      orgNumber:        form.customerType === "business" ? form.orgNumber || null : null,
      vatNumber:        form.vatNumber || null,
      personalNumber:   form.customerType === "individual" ? form.personalNumber || null : null,
      email:            form.email || null,
      phone:            form.phone || null,
      phone2:           form.phone2 || null,
      fax:              form.fax || null,
      website:          form.website || null,
      addressLine1:     form.addressLine1 || null,
      addressLine2:     form.addressLine2 || null,
      postalCode:       form.postalCode || null,
      city:             form.city || null,
      country:          form.country || "SE",
      countryCode:      form.countryCode || null,
      deliveryLine1:    form.sameAsInvoice ? null : form.deliveryLine1 || null,
      deliveryLine2:    form.sameAsInvoice ? null : form.deliveryLine2 || null,
      deliveryPostalCode: form.sameAsInvoice ? null : form.deliveryPostalCode || null,
      deliveryCity:     form.sameAsInvoice ? null : form.deliveryCity || null,
      deliveryCountry:  form.sameAsInvoice ? null : form.deliveryCountry || null,
      internalNotes:    form.internalNotes || null,
      defaultPaymentTermsDays: form.defaultPaymentTermsDays ? parseInt(form.defaultPaymentTermsDays) : null,
      deliveryTermsId:  form.deliveryTermsId || null,
      deliveryMethodId: form.deliveryMethodId || null,
      priceListId:      form.priceListId || null,
      defaultCurrency:  form.defaultCurrency || null,
      invoiceDiscountRate: form.invoiceDiscountRate ? parseFloat(form.invoiceDiscountRate) : null,
      invoiceFeeAmount: form.invoiceFeeAmount ? Math.round(parseFloat(form.invoiceFeeAmount) * 100) : null,
      freightAmount:    form.freightAmount ? Math.round(parseFloat(form.freightAmount) * 100) : null,
      pricesIncludeVat: form.pricesIncludeVat,
      ourReference:     form.ourReference || null,
      accountManagerId: form.accountManagerId || null,
      externalReference:form.externalReference || null,
      yourReferenceLabel: form.yourReferenceLabel || null,
      customerReference:form.customerReference || null,
      defaultVatType:   form.defaultVatType || null,
      salesAccountOverride: form.salesAccountOverride || null,
      invoiceEmails:    form.invoiceEmails.length ? form.invoiceEmails : null,
      invoiceFreeText:  form.invoiceFreeText || null,
      interestInvoicing:form.interestInvoicing,
    }

    const url = mode === "new" ? "/api/contacts" : `/api/contacts/${customerId}`
    const method = mode === "new" ? "POST" : "PUT"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (res.ok) {
      const data = await res.json()
      if (mode === "new") {
        try { localStorage.removeItem(DRAFT_KEY) } catch {}
      }
      if (onSaved) {
        onSaved(data.id)
      } else {
        router.push(`/${orgSlug}/customers/${data.id}`)
      }
    } else {
      const d = await res.json().catch(() => ({ error: "Okänt fel" }))
      setServerError(d.error ?? "Något gick fel")
    }
  }

  async function verifyVies() {
    if (!form.vatNumber) return
    setViesLoading(true)
    setViesResult(null)
    const res = await fetch("/api/integrations/vies/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vatNumber: form.vatNumber }),
    })
    const d = await res.json().catch(() => ({}))
    setViesLoading(false)
    setViesResult(res.ok ? `✓ ${d.name ?? "Giltig"}` : `✗ ${d.error ?? "Ogiltigt VAT-nummer"}`)
  }

  const countryOptions = [
    { value: "", label: "— Välj land —" },
    ...COUNTRIES.map(c => ({ value: c.code, label: c.name })),
  ]

  const paymentTermOptions = [
    { value: "", label: "— Välj —" },
    ...(paymentTerms.length > 0
      ? paymentTerms.map(pt => ({ value: String(pt.days), label: pt.name }))
      : DEFAULT_PAYMENT_DAYS.slice(1)),
  ]

  const deliveryTermOptions = [
    { value: "", label: "— Välj —" },
    ...deliveryTerms.map(d => ({ value: d.id, label: d.name })),
  ]

  const deliveryMethodOptions = [
    { value: "", label: "— Välj —" },
    ...deliveryMethods.map(d => ({ value: d.id, label: d.name })),
  ]

  const priceListOptions = [
    { value: "", label: "— Välj —" },
    ...priceLists.map(p => ({ value: p.id, label: p.name })),
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-20">
        {/* Tab navigation */}
        <div className="border-b border sticky top-0 bg-background z-10">
          <div className="flex overflow-x-auto scrollbar-none px-6">
            {TABS.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(i)}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === i
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <form id="customer-form" onSubmit={handleSubmit}>
          <div className="p-6 max-w-3xl space-y-6">

            {/* ── Tab 0: Allmän information ── */}
            {tab === 0 && (
              <>
                {/* Kundnummer */}
                <section>
                  <h2 className="text-sm font-semibold text-foreground mb-3">Kundnummer</h2>
                  <Field label="Kundnummer">
                    {mode === "new" ? (
                      <input
                        value={form.customerNumber}
                        onChange={set("customerNumber")}
                        placeholder="Genereras automatiskt"
                        className={inputCls}
                      />
                    ) : (
                      <input
                        value={form.customerNumber}
                        onChange={set("customerNumber")}
                        className={inputCls}
                      />
                    )}
                  </Field>
                </section>

                {/* Kundtyp */}
                <section>
                  <h2 className="text-sm font-semibold text-foreground mb-3">Kundtyp</h2>
                  <div className="flex gap-4">
                    {(["business", "individual"] as const).map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="customerType"
                          value={t}
                          checked={form.customerType === t}
                          onChange={() => setForm(f => ({ ...f, customerType: t }))}
                          className="accent-primary"
                        />
                        <span className="text-sm text-foreground">
                          {t === "business" ? "Företag" : "Privatperson"}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Identity fields */}
                <section className="grid grid-cols-2 gap-4">
                  {form.customerType === "business" ? (
                    <>
                      <Field label="Org.nummer">
                        <input value={form.orgNumber} onChange={set("orgNumber")} className={inputCls} placeholder="556000-0000" />
                      </Field>
                    </>
                  ) : (
                    <Field label="Personnummer">
                      <input value={form.personalNumber} onChange={set("personalNumber")} className={inputCls} placeholder="YYYYMMDD-NNNN" />
                    </Field>
                  )}
                  <Field label="Status">
                    <Toggle
                      checked={!form.isArchived}
                      onChange={v => setForm(f => ({ ...f, isArchived: !v }))}
                      label={form.isArchived ? "Inaktiv" : "Aktiv"}
                    />
                  </Field>
                </section>

                {/* Namn */}
                <Field label="Namn *">
                  <input
                    required
                    value={form.name}
                    onChange={set("name")}
                    className={`${inputCls} ${errors.name ? "border-destructive bg-destructive/5" : ""}`}
                    placeholder="Företagets namn"
                  />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                </Field>

                {/* Adress */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">Fakturaadress</h2>
                  <Field label="Adressrad 1">
                    <input value={form.addressLine1} onChange={set("addressLine1")} className={inputCls} placeholder="Storgatan 1" />
                  </Field>
                  <Field label="Adressrad 2">
                    <input value={form.addressLine2} onChange={set("addressLine2")} className={inputCls} placeholder="c/o Namn" />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Postnummer">
                      <input value={form.postalCode} onChange={set("postalCode")} className={inputCls} placeholder="123 45" />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Stad">
                        <input value={form.city} onChange={set("city")} className={inputCls} placeholder="Stockholm" />
                      </Field>
                    </div>
                  </div>
                  <Select label="Land" value={form.country} onChange={set("country")} options={countryOptions} />
                </section>

                {/* Kontaktuppgifter */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">Kontaktuppgifter</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Landskod (tel)">
                      <input value={form.countryCode} onChange={set("countryCode")} className={inputCls} placeholder="+46" />
                    </Field>
                    <Field label="Telefon">
                      <input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+46 8 000 00 00" />
                    </Field>
                    <Field label="Telefon 2">
                      <input value={form.phone2} onChange={set("phone2")} className={inputCls} />
                    </Field>
                    <Field label="Fax">
                      <input value={form.fax} onChange={set("fax")} className={inputCls} />
                    </Field>
                    <Field label="E-post">
                      <input type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="info@foretaget.se" />
                    </Field>
                    <Field label="Webbplats">
                      <input value={form.website} onChange={set("website")} className={inputCls} placeholder="https://foretaget.se" />
                    </Field>
                  </div>
                </section>
              </>
            )}

            {/* ── Tab 1: Leverans & Besök ── */}
            {tab === 1 && (
              <>
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Leveransadress</h2>
                    <Toggle
                      checked={form.sameAsInvoice}
                      onChange={setBool("sameAsInvoice")}
                      label="Samma som fakturaadress"
                    />
                  </div>
                  {!form.sameAsInvoice && (
                    <div className="space-y-3">
                      <Field label="Adressrad 1">
                        <input value={form.deliveryLine1} onChange={set("deliveryLine1")} className={inputCls} />
                      </Field>
                      <Field label="Adressrad 2">
                        <input value={form.deliveryLine2} onChange={set("deliveryLine2")} className={inputCls} />
                      </Field>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Postnummer">
                          <input value={form.deliveryPostalCode} onChange={set("deliveryPostalCode")} className={inputCls} />
                        </Field>
                        <div className="col-span-2">
                          <Field label="Stad">
                            <input value={form.deliveryCity} onChange={set("deliveryCity")} className={inputCls} />
                          </Field>
                        </div>
                      </div>
                      <Select label="Land" value={form.deliveryCountry} onChange={set("deliveryCountry")} options={countryOptions} />
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Besöksadress</h2>
                    <Toggle
                      checked={form.visitSameAsInvoice}
                      onChange={setBool("visitSameAsInvoice")}
                      label="Samma som fakturaadress"
                    />
                  </div>
                  {!form.visitSameAsInvoice && (
                    <div className="space-y-3">
                      <Field label="Adressrad 1">
                        <input value={form.visitingLine1} onChange={set("visitingLine1")} className={inputCls} />
                      </Field>
                      <Field label="Adressrad 2">
                        <input value={form.visitingLine2} onChange={set("visitingLine2")} className={inputCls} />
                      </Field>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Postnummer">
                          <input value={form.visitingPostalCode} onChange={set("visitingPostalCode")} className={inputCls} />
                        </Field>
                        <div className="col-span-2">
                          <Field label="Stad">
                            <input value={form.visitingCity} onChange={set("visitingCity")} className={inputCls} />
                          </Field>
                        </div>
                      </div>
                      <Select label="Land" value={form.visitingCountry} onChange={set("visitingCountry")} options={countryOptions} />
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── Tab 2: Anteckningar ── */}
            {tab === 2 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Interna anteckningar</h2>
                <textarea
                  value={form.internalNotes}
                  onChange={set("internalNotes")}
                  rows={8}
                  className={`${inputCls} resize-none`}
                  placeholder="Synliga anteckningar om kunden (ej synliga på fakturor)…"
                />
                {mode === "edit" && (
                  <p className="text-xs text-muted-foreground">Anteckningarna sparas direkt när du sparar formuläret.</p>
                )}
              </section>
            )}

            {/* ── Tab 3: Fakturadata ── */}
            {tab === 3 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Fakturainställningar</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Betalningsvillkor"
                    value={form.defaultPaymentTermsDays}
                    onChange={set("defaultPaymentTermsDays")}
                    options={paymentTermOptions}
                  />
                  <Select
                    label="Leveransvillkor"
                    value={form.deliveryTermsId}
                    onChange={set("deliveryTermsId")}
                    options={deliveryTermOptions}
                  />
                  <Select
                    label="Leveranssätt"
                    value={form.deliveryMethodId}
                    onChange={set("deliveryMethodId")}
                    options={deliveryMethodOptions}
                  />
                  <Select
                    label="Prislista"
                    value={form.priceListId}
                    onChange={set("priceListId")}
                    options={priceListOptions}
                  />
                  <Select
                    label="Standardvaluta"
                    value={form.defaultCurrency}
                    onChange={set("defaultCurrency")}
                    options={CURRENCIES}
                  />
                  <Field label="Fakturarabatt (%)">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.invoiceDiscountRate}
                      onChange={set("invoiceDiscountRate")}
                      className={inputCls}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Fakturaavgift (kr)">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.invoiceFeeAmount}
                      onChange={set("invoiceFeeAmount")}
                      className={inputCls}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Frakt (kr)">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.freightAmount}
                      onChange={set("freightAmount")}
                      className={inputCls}
                      placeholder="0.00"
                    />
                  </Field>
                </div>
                <div className="flex gap-6">
                  <Toggle checked={form.interestInvoicing} onChange={setBool("interestInvoicing")} label="Dröjsmålsränta" />
                  <Toggle checked={form.pricesIncludeVat} onChange={setBool("pricesIncludeVat")} label="Priser inkl. moms" />
                </div>
              </section>
            )}

            {/* ── Tab 4: Referenser ── */}
            {tab === 4 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Referenser</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Vår referens"
                    value={form.ourReference}
                    onChange={set("ourReference")}
                    placeholder="Handläggare…"
                  />
                  <Input
                    label="Extern referens"
                    value={form.externalReference}
                    onChange={set("externalReference")}
                  />
                  <Input
                    label="Er referens (etikett)"
                    value={form.yourReferenceLabel}
                    onChange={set("yourReferenceLabel")}
                    placeholder="Er referens"
                  />
                  <Input
                    label={form.yourReferenceLabel || "Er referens"}
                    value={form.customerReference}
                    onChange={set("customerReference")}
                    placeholder="Kundens referens…"
                  />
                </div>
              </section>
            )}

            {/* ── Tab 5: Bokföring ── */}
            {tab === 5 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Bokföringsinställningar</h2>
                <div className="space-y-3">
                  <Field label="VAT-nummer">
                    <div className="flex gap-2">
                      <input
                        value={form.vatNumber}
                        onChange={set("vatNumber")}
                        className={`${inputCls} flex-1`}
                        placeholder="SE556000000001"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={verifyVies}
                        loading={viesLoading}
                      >
                        Verifiera VIES
                      </Button>
                    </div>
                    {viesResult && (
                      <p className={`mt-1 text-xs ${viesResult.startsWith("✓") ? "text-success" : "text-destructive"}`}>
                        {viesResult}
                      </p>
                    )}
                  </Field>
                  <Select
                    label="Standard momskod"
                    value={form.defaultVatType}
                    onChange={set("defaultVatType")}
                    options={VAT_TYPES}
                  />
                  <Input
                    label="Försäljningskonto (override)"
                    value={form.salesAccountOverride}
                    onChange={set("salesAccountOverride")}
                    placeholder="3001"
                    hint="Lämna tomt för att använda organisationsinställningen"
                  />
                </div>
              </section>
            )}

            {/* ── Tab 6: E-post ── */}
            {tab === 6 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">E-postinställningar</h2>
                <Field label="E-post (från Allmän information)">
                  <input value={form.email} readOnly className={`${inputCls} opacity-60 cursor-default`} />
                </Field>
                <Field label="Fakturaadresser (skicka kopia till)">
                  <EmailChips
                    values={form.invoiceEmails}
                    onChange={v => setForm(f => ({ ...f, invoiceEmails: v }))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Tryck Enter eller komma för att lägga till.</p>
                </Field>
              </section>
            )}

            {/* ── Tab 7: Fakturatext ── */}
            {tab === 7 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Fakturatext</h2>
                <textarea
                  value={form.invoiceFreeText}
                  onChange={set("invoiceFreeText")}
                  rows={6}
                  className={`${inputCls} resize-none`}
                  placeholder="Text som visas på alla fakturor till denna kund…"
                />
                <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Tillgängliga variabler:</p>
                  <p><code className="font-mono">{"{dagensdatum}"}</code> — Dagens datum</p>
                  <p><code className="font-mono">{"{kundnamn}"}</code> — Kundens namn</p>
                </div>
              </section>
            )}

          </div>
        </form>

        {serverError && (
          <div className="mx-6 mt-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {serverError}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card px-6 py-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/${orgSlug}/customers`)}
        >
          Avbryt
        </Button>
        <Button
          type="submit"
          form="customer-form"
          loading={saving}
        >
          {mode === "new" ? "Skapa kund" : "Spara ändringar"}
        </Button>
      </div>
    </div>
  )
}
