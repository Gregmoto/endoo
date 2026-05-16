"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type FormData = {
  name: string
  type: "business" | "individual"
  status: "active" | "inactive" | "blocked" | "ended" | "test"
  customerNumber: string
  email: string
  phone: string
  website: string
  orgNumber: string
  vatNumber: string
  addressLine1: string
  addressLine2: string
  city: string
  postalCode: string
  country: string
  deliveryLine1: string
  deliveryLine2: string
  deliveryCity: string
  deliveryPostalCode: string
  deliveryCountry: string
  defaultCurrency: string
  defaultPaymentTermsDays: string
  customerReference: string
  notes: string
}

const EMPTY: FormData = {
  name: "", type: "business", status: "active",
  customerNumber: "", email: "", phone: "", website: "",
  orgNumber: "", vatNumber: "",
  addressLine1: "", addressLine2: "", city: "", postalCode: "", country: "SE",
  deliveryLine1: "", deliveryLine2: "", deliveryCity: "", deliveryPostalCode: "", deliveryCountry: "",
  defaultCurrency: "SEK", defaultPaymentTermsDays: "30",
  customerReference: "", notes: "",
}

export default function NewContactPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const payload = {
      ...form,
      defaultPaymentTermsDays: form.defaultPaymentTermsDays ? parseInt(form.defaultPaymentTermsDays) : null,
      customerNumber:   form.customerNumber   || null,
      email:            form.email            || null,
      phone:            form.phone            || null,
      website:          form.website          || null,
      orgNumber:        form.orgNumber        || null,
      vatNumber:        form.vatNumber        || null,
      addressLine1:     form.addressLine1     || null,
      addressLine2:     form.addressLine2     || null,
      city:             form.city             || null,
      postalCode:       form.postalCode       || null,
      deliveryLine1:    form.deliveryLine1    || null,
      deliveryLine2:    form.deliveryLine2    || null,
      deliveryCity:     form.deliveryCity     || null,
      deliveryPostalCode: form.deliveryPostalCode || null,
      deliveryCountry:  form.deliveryCountry  || null,
      defaultCurrency:  form.defaultCurrency  || null,
      customerReference: form.customerReference || null,
      notes:            form.notes            || null,
    }

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const contact = await res.json()
      router.push(`/${params.orgSlug}/contacts/${contact.id}`)
    } else {
      const d = await res.json()
      setError(d.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${params.orgSlug}/contacts`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Kontakter
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Ny kontakt</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitet */}
        <Card>
          <CardHeader><CardTitle>Identitet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Typ">
                <select value={form.type} onChange={set("type")} className={cls}>
                  <option value="business">Företag</option>
                  <option value="individual">Privatperson</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={set("status")} className={cls}>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="test">Test</option>
                </select>
              </Field>
            </div>
            <Field label="Namn *">
              <input required value={form.name} onChange={set("name")} className={cls} placeholder="AB Företaget" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kundnummer (auto om tomt)">
                <input value={form.customerNumber} onChange={set("customerNumber")} className={cls} placeholder="K-0001" />
              </Field>
              <Field label="Org.nummer">
                <input value={form.orgNumber} onChange={set("orgNumber")} className={cls} placeholder="556000-0000" />
              </Field>
            </div>
            <Field label="VAT-nummer">
              <input value={form.vatNumber} onChange={set("vatNumber")} className={cls} placeholder="SE556000000001" />
            </Field>
          </CardContent>
        </Card>

        {/* Kontaktuppgifter */}
        <Card>
          <CardHeader><CardTitle>Kontaktuppgifter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="E-postadress">
                <input type="email" value={form.email} onChange={set("email")} className={cls} placeholder="info@foretaget.se" />
              </Field>
              <Field label="Telefon">
                <input value={form.phone} onChange={set("phone")} className={cls} placeholder="+46 8 000 00 00" />
              </Field>
            </div>
            <Field label="Webbplats">
              <input value={form.website} onChange={set("website")} className={cls} placeholder="https://foretaget.se" />
            </Field>
          </CardContent>
        </Card>

        {/* Fakturaadress */}
        <Card>
          <CardHeader><CardTitle>Fakturaadress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Adressrad 1">
              <input value={form.addressLine1} onChange={set("addressLine1")} className={cls} placeholder="Storgatan 1" />
            </Field>
            <Field label="Adressrad 2">
              <input value={form.addressLine2} onChange={set("addressLine2")} className={cls} placeholder="c/o Namn" />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Postnummer">
                <input value={form.postalCode} onChange={set("postalCode")} className={cls} placeholder="123 45" />
              </Field>
              <div className="col-span-2">
                <Field label="Stad">
                  <input value={form.city} onChange={set("city")} className={cls} placeholder="Stockholm" />
                </Field>
              </div>
            </div>
            <Field label="Land (ISO 2)">
              <input value={form.country} onChange={set("country")} maxLength={2} className={cls} placeholder="SE" />
            </Field>
          </CardContent>
        </Card>

        {/* Leveransadress */}
        <Card>
          <CardHeader><CardTitle>Leveransadress <span className="text-sm font-normal text-gray-400">(om annan)</span></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Adressrad 1">
              <input value={form.deliveryLine1} onChange={set("deliveryLine1")} className={cls} placeholder="Lagergatan 5" />
            </Field>
            <Field label="Adressrad 2">
              <input value={form.deliveryLine2} onChange={set("deliveryLine2")} className={cls} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Postnummer">
                <input value={form.deliveryPostalCode} onChange={set("deliveryPostalCode")} className={cls} />
              </Field>
              <div className="col-span-2">
                <Field label="Stad">
                  <input value={form.deliveryCity} onChange={set("deliveryCity")} className={cls} />
                </Field>
              </div>
            </div>
            <Field label="Land (ISO 2)">
              <input value={form.deliveryCountry} onChange={set("deliveryCountry")} maxLength={2} className={cls} />
            </Field>
          </CardContent>
        </Card>

        {/* Faktureringsinställningar */}
        <Card>
          <CardHeader><CardTitle>Faktureringsinställningar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Standardvaluta">
                <input value={form.defaultCurrency} onChange={set("defaultCurrency")} maxLength={3} className={cls} placeholder="SEK" />
              </Field>
              <Field label="Betalningsvillkor (dagar)">
                <input type="number" min={0} max={365} value={form.defaultPaymentTermsDays} onChange={set("defaultPaymentTermsDays")} className={cls} placeholder="30" />
              </Field>
            </div>
            <Field label="Er referens (syns på faktura)">
              <input value={form.customerReference} onChange={set("customerReference")} className={cls} placeholder="Inköpsorder, projektnamn…" />
            </Field>
          </CardContent>
        </Card>

        {/* Anteckningar */}
        <Card>
          <CardHeader><CardTitle>Anteckningar</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={4}
              className={`${cls} resize-none`}
              placeholder="Synliga anteckningar om kunden…"
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>Skapa kontakt</Button>
          <Link href={`/${params.orgSlug}/contacts`}>
            <Button type="button" variant="outline">Avbryt</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
