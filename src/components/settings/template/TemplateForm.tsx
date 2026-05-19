"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Section, Field, TextInput, TextArea, Toggle } from "./TemplateFormSections"
import type { TemplateFormValues } from "./types"

const selectCls = "w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const fieldCls  = "w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

interface Props {
  form:     TemplateFormValues
  onChange: (updates: Partial<TemplateFormValues>) => void
}

export function TemplateForm({ form, onChange }: Props) {
  const f = <K extends keyof TemplateFormValues>(k: K) =>
    (v: TemplateFormValues[K]) => onChange({ [k]: v } as Partial<TemplateFormValues>)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError("")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("field", "pdfLogoUrl")
    const res = await fetch("/api/settings/branding/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok && data.url) {
      onChange({ logoUrl: data.url })
    } else {
      setUploadError(data.error ?? "Uppladdning misslyckades")
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-3">

      {/* Logotyp */}
      <Section title="Logotyp" defaultOpen>
        {form.logoUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.logoUrl}
              alt="Logotyp"
              className="h-14 w-auto max-w-[180px] object-contain rounded border border-border p-1.5 bg-muted/20"
            />
            <button
              type="button"
              onClick={() => onChange({ logoUrl: "" })}
              className="text-xs text-destructive hover:underline"
            >
              Ta bort
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Ingen logotyp uppladdad</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {uploading ? "Laddar upp…" : "Välj bild"}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleLogoUpload}
        />

        {form.logoUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {uploading ? "Laddar upp…" : "Byt logotyp"}
          </button>
        )}

        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}

        <Field label="Eller ange URL direkt" hint="PNG, JPG, SVG eller WEBP">
          <TextInput
            value={form.logoUrl}
            onChange={f("logoUrl")}
            placeholder=""
          />
        </Field>

        <Toggle checked={form.showLogo} onChange={f("showLogo")} label="Visa logotyp på fakturan" />
      </Section>

      {/* Adress & Kontakt */}
      <Section title="Adress & Kontakt" defaultOpen>
        <Field label="Postadress" hint="Separera rader med Enter">
          <TextArea value={form.postalAddress} onChange={f("postalAddress")} rows={3} />
        </Field>
        <Field label="Gatuadress">
          <TextInput value={form.streetAddress} onChange={f("streetAddress")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Telefon">
            <TextInput value={form.phone} onChange={f("phone")} />
          </Field>
          <Field label="Fax (valfri)">
            <TextInput value={form.fax} onChange={f("fax")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="E-post">
            <TextInput value={form.email} onChange={f("email")} />
          </Field>
          <Field label="Webbadress">
            <TextInput value={form.website} onChange={f("website")} />
          </Field>
        </div>
      </Section>

      {/* Bankuppgifter */}
      <Section title="Bankuppgifter">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Bankgiro">
            <TextInput value={form.bankgiro} onChange={f("bankgiro")} />
          </Field>
          <Field label="Plusgiro">
            <TextInput value={form.plusgiro} onChange={f("plusgiro")} />
          </Field>
        </div>
        <Field label="IBAN">
          <TextInput value={form.iban} onChange={f("iban")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="BIC/SWIFT">
            <TextInput value={form.bic} onChange={f("bic")} />
          </Field>
          <Field label="Organisationens VAT-nr">
            <TextInput value={form.vatNumber} onChange={f("vatNumber")} />
          </Field>
        </div>
        <Toggle checked={form.fScattCertified} onChange={f("fScattCertified")} label="Godkänd för F-skatt" />
      </Section>

      {/* Swish */}
      <Section title="Swish">
        <Toggle checked={form.showSwishQr} onChange={f("showSwishQr")} label="Visa Swish QR-kod på fakturan" />
        {form.showSwishQr && (
          <Field label="Swish-nummer">
            <TextInput value={form.swishNumber} onChange={f("swishNumber")} />
          </Field>
        )}
      </Section>

      {/* Företagsuppgifter */}
      <Section title="Företagsuppgifter">
        <Field label="Styrelsens säte">
          <TextInput value={form.boardSeat} onChange={f("boardSeat")} />
        </Field>
      </Section>

      {/* Text & Meddelanden */}
      <Section title="Text & Meddelanden">
        <Field
          label="Info-box-text"
          hint="Visas i centrerad ruta på fakturan, t.ex. 'Vår fordran har överlåtits till Handelsbanken...'"
        >
          <TextArea value={form.footerText} onChange={f("footerText")} rows={4} />
        </Field>
        <p className="text-xs text-muted-foreground">
          Dröjsmålsränta konfigureras under{" "}
          <Link href="../interest" className="text-primary hover:underline">Ränta & påminnelser</Link>.
        </p>
      </Section>

      {/* Mall-inställningar */}
      <Section title="Mall-inställningar">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Mall-namn">
            <TextInput value={form.name} onChange={f("name")} placeholder="Standard" />
          </Field>
          <Field label="Språk">
            <select
              value={form.language}
              onChange={e => onChange({ language: e.target.value as "sv" | "en" })}
              className={selectCls}
            >
              <option value="sv">Svenska</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
        <Toggle checked={form.isDefault}  onChange={f("isDefault")}  label="Använd som standardmall" />
        <Toggle checked={form.isActive}   onChange={f("isActive")}   label="Mallen är aktiv" />
      </Section>

    </div>
  )
}
