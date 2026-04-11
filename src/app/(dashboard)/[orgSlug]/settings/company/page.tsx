"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type CompanyForm = {
  name: string
  orgNumber: string
  vatNumber: string
  contactEmail: string
  phone: string
  website: string
  addressLine1: string
  addressLine2: string
  city: string
  postalCode: string
  country: string
  locale: string
  timezone: string
  defaultCurrency: string
  primaryColor: string
}

const EMPTY: CompanyForm = {
  name: "", orgNumber: "", vatNumber: "", contactEmail: "",
  phone: "", website: "", addressLine1: "", addressLine2: "",
  city: "", postalCode: "", country: "SE", locale: "sv-SE",
  timezone: "Europe/Stockholm", defaultCurrency: "SEK", primaryColor: "",
}

export default function CompanySettingsPage() {
  const [form, setForm] = useState<CompanyForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/settings/company")
      .then(r => r.json())
      .then(data => {
        setForm({
          name:            data.name            ?? "",
          orgNumber:       data.orgNumber        ?? "",
          vatNumber:       data.vatNumber        ?? "",
          contactEmail:    data.contactEmail     ?? "",
          phone:           data.phone            ?? "",
          website:         data.website          ?? "",
          addressLine1:    data.addressLine1     ?? "",
          addressLine2:    data.addressLine2     ?? "",
          city:            data.city             ?? "",
          postalCode:      data.postalCode       ?? "",
          country:         data.country          ?? "SE",
          locale:          data.locale           ?? "sv-SE",
          timezone:        data.timezone         ?? "Europe/Stockholm",
          defaultCurrency: data.defaultCurrency  ?? "SEK",
          primaryColor:    data.primaryColor     ?? "",
        })
        setLoading(false)
      })
  }, [])

  function set(key: keyof CompanyForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const res = await fetch("/api/settings/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        orgNumber:    form.orgNumber    || null,
        vatNumber:    form.vatNumber    || null,
        contactEmail: form.contactEmail || null,
        phone:        form.phone        || null,
        website:      form.website      || null,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        city:         form.city         || null,
        postalCode:   form.postalCode   || null,
        primaryColor: form.primaryColor || null,
      }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Företagsuppgifter</h1>
        <p className="text-sm text-gray-500 mt-1">Uppgifter som visas på fakturor och i systemet</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitet */}
        <Card>
          <CardHeader><CardTitle>Identitet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Företagsnamn" required>
              <input value={form.name} onChange={set("name")} required className={cls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Organisationsnummer">
                <input value={form.orgNumber} onChange={set("orgNumber")} className={cls} placeholder="556xxx-xxxx" />
              </Field>
              <Field label="Momsnummer (VAT)">
                <input value={form.vatNumber} onChange={set("vatNumber")} className={cls} placeholder="SE556xxxxxxxx01" />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Kontaktuppgifter */}
        <Card>
          <CardHeader><CardTitle>Kontaktuppgifter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="E-post (publik)">
                <input type="email" value={form.contactEmail} onChange={set("contactEmail")} className={cls} placeholder="info@foretag.se" />
              </Field>
              <Field label="Telefon">
                <input value={form.phone} onChange={set("phone")} className={cls} placeholder="+46 70 000 00 00" />
              </Field>
            </div>
            <Field label="Webbplats">
              <input value={form.website} onChange={set("website")} className={cls} placeholder="https://foretag.se" />
            </Field>
          </CardContent>
        </Card>

        {/* Adress */}
        <Card>
          <CardHeader><CardTitle>Adress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Gatuadress">
              <input value={form.addressLine1} onChange={set("addressLine1")} className={cls} placeholder="Storgatan 1" />
            </Field>
            <Field label="Adressrad 2">
              <input value={form.addressLine2} onChange={set("addressLine2")} className={cls} placeholder="c/o, vån 3..." />
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
              <select value={form.country} onChange={set("country")} className={cls}>
                <option value="SE">Sverige</option>
                <option value="NO">Norge</option>
                <option value="DK">Danmark</option>
                <option value="FI">Finland</option>
                <option value="DE">Tyskland</option>
                <option value="GB">Storbritannien</option>
                <option value="US">USA</option>
              </select>
            </Field>
          </CardContent>
        </Card>

        {/* Lokalisering */}
        <Card>
          <CardHeader><CardTitle>Lokalisering</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Valuta">
                <select value={form.defaultCurrency} onChange={set("defaultCurrency")} className={cls}>
                  <option value="SEK">SEK — Krona</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — Dollar</option>
                  <option value="NOK">NOK — Norsk krone</option>
                  <option value="DKK">DKK — Dansk krone</option>
                  <option value="GBP">GBP — Pund</option>
                </select>
              </Field>
              <Field label="Språk">
                <select value={form.locale} onChange={set("locale")} className={cls}>
                  <option value="sv-SE">Svenska</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-US">English (US)</option>
                  <option value="nb-NO">Norsk</option>
                  <option value="da-DK">Dansk</option>
                </select>
              </Field>
              <Field label="Tidszon">
                <select value={form.timezone} onChange={set("timezone")} className={cls}>
                  <option value="Europe/Stockholm">Stockholm (CET)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Berlin">Berlin (CET)</option>
                  <option value="America/New_York">New York (EST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Varumärke */}
        <Card>
          <CardHeader><CardTitle>Varumärke</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Primärfärg (hex, används i PDF-fakturor)">
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={form.primaryColor || "#4f46e5"}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  value={form.primaryColor}
                  onChange={set("primaryColor")}
                  className={cls + " font-mono"}
                  placeholder="#4f46e5"
                  maxLength={7}
                />
              </div>
            </Field>
            <Field label="Logotyp">
              <p className="text-xs text-gray-500 mt-1">Logotypuppladdning kommer i en kommande uppdatering.</p>
            </Field>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>Spara ändringar</Button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Sparat</span>}
        </div>
      </form>
    </div>
  )
}

const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
