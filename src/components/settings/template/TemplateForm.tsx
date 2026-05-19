"use client"

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

  return (
    <div className="space-y-3">

      {/* Logotyp */}
      <Section title="Logotyp" defaultOpen>
        <Field label="Logotyp-URL" hint="PNG, JPG eller SVG — max 500 KB">
          <TextInput
            value={form.logoUrl}
            onChange={f("logoUrl")}
            placeholder="https://example.com/logo.png"
          />
        </Field>
        {form.logoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={form.logoUrl}
            alt="Logotyp"
            className="h-12 w-auto object-contain rounded border border-border p-1 bg-muted/20"
          />
        )}
        <Toggle checked={form.showLogo} onChange={f("showLogo")} label="Visa logotyp på fakturan" />
      </Section>

      {/* Adress & Kontakt */}
      <Section title="Adress & Kontakt" defaultOpen>
        <Field label="Postadress" hint="Separera rader med Enter">
          <TextArea
            value={form.postalAddress}
            onChange={f("postalAddress")}
            placeholder={"Endoo AB\n245 34 Staffanstorp"}
            rows={3}
          />
        </Field>
        <Field label="Gatuadress">
          <TextInput value={form.streetAddress} onChange={f("streetAddress")} placeholder="Maskinvägen 1" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Telefon">
            <TextInput value={form.phone} onChange={f("phone")} placeholder="08-123 45 67" />
          </Field>
          <Field label="Fax (valfri)">
            <TextInput value={form.fax} onChange={f("fax")} placeholder="08-123 45 68" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="E-post">
            <TextInput value={form.email} onChange={f("email")} placeholder="info@foretaget.se" />
          </Field>
          <Field label="Webbadress">
            <TextInput value={form.website} onChange={f("website")} placeholder="www.foretaget.se" />
          </Field>
        </div>
      </Section>

      {/* Bankuppgifter */}
      <Section title="Bankuppgifter">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Bankgiro">
            <TextInput value={form.bankgiro} onChange={f("bankgiro")} placeholder="173-4987" />
          </Field>
          <Field label="Plusgiro">
            <TextInput value={form.plusgiro} onChange={f("plusgiro")} placeholder="12 34 56-7" />
          </Field>
        </div>
        <Field label="IBAN">
          <TextInput value={form.iban} onChange={f("iban")} placeholder="SE79 6000 0000 0004 8590 3741" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="BIC/SWIFT">
            <TextInput value={form.bic} onChange={f("bic")} placeholder="HANDSESS" />
          </Field>
          <Field label="Organisationens VAT-nr">
            <TextInput value={form.vatNumber} onChange={f("vatNumber")} placeholder="SE556000000001" />
          </Field>
        </div>
        <Toggle checked={form.fScattCertified} onChange={f("fScattCertified")} label="Godkänd för F-skatt" />
      </Section>

      {/* Swish */}
      <Section title="Swish">
        <Toggle checked={form.showSwishQr} onChange={f("showSwishQr")} label="Visa Swish QR-kod på fakturan" />
        {form.showSwishQr && (
          <Field label="Swish-nummer">
            <TextInput value={form.swishNumber} onChange={f("swishNumber")} placeholder="123 123 12 34" />
          </Field>
        )}
      </Section>

      {/* Företagsuppgifter */}
      <Section title="Företagsuppgifter">
        <Field label="Styrelsens säte">
          <TextInput value={form.boardSeat} onChange={f("boardSeat")} placeholder="Staffanstorp" />
        </Field>
      </Section>

      {/* Text & Meddelanden */}
      <Section title="Text & Meddelanden">
        <Field
          label="Info-box-text"
          hint="Visas i centrerad ruta på fakturan, t.ex. 'Vår fordran har överlåtits till Handelsbanken...'"
        >
          <TextArea
            value={form.footerText}
            onChange={f("footerText")}
            placeholder="Vår fordran enligt denna faktura har överlåtits till…"
            rows={4}
          />
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
