"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

const CLS = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
const BTN_PRIMARY = "rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
const BTN_SECONDARY = "rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"

type Profile = {
  displayName:      string | null
  logoUrl:          string | null
  logoDarkUrl:      string | null
  faviconUrl:       string | null
  primaryColor:     string | null
  accentColor:      string | null
  textOnPrimary:    string | null
  senderName:       string | null
  senderEmail:      string | null
  replyTo:          string | null
  emailLogoUrl:     string | null
  pdfLogoUrl:       string | null
  pdfAccentColor:   string | null
  pdfFooterText:    string | null
  pdfShowPoweredBy: boolean
  applyToClients:   boolean
  allowClientOverride: boolean
}

const DEFAULTS: Profile = {
  displayName: "", logoUrl: null, logoDarkUrl: null, faviconUrl: null,
  primaryColor: "#4f46e5", accentColor: "#6366f1", textOnPrimary: "#ffffff",
  senderName: "", senderEmail: "", replyTo: "", emailLogoUrl: null,
  pdfLogoUrl: null, pdfAccentColor: "#4f46e5", pdfFooterText: "",
  pdfShowPoweredBy: true, applyToClients: false, allowClientOverride: true,
}

type UploadField = "logoUrl" | "logoDarkUrl" | "faviconUrl" | "emailLogoUrl" | "pdfLogoUrl"

export default function BrandingPage() {
  const [profile, setProfile]   = useState<Profile>(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [uploading, setUploading] = useState<UploadField | null>(null)
  const fileRefs = {
    logoUrl:      useRef<HTMLInputElement>(null),
    logoDarkUrl:  useRef<HTMLInputElement>(null),
    faviconUrl:   useRef<HTMLInputElement>(null),
    emailLogoUrl: useRef<HTMLInputElement>(null),
    pdfLogoUrl:   useRef<HTMLInputElement>(null),
  }

  useEffect(() => {
    fetch("/api/settings/branding")
      .then(r => r.json())
      .then(({ profile: p }) => {
        if (p) setProfile({ ...DEFAULTS, ...p })
      })
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  async function uploadFile(field: UploadField, file: File) {
    setUploading(field)
    const form = new FormData()
    form.append("file", file)
    form.append("field", field)
    const res = await fetch("/api/settings/branding/upload", { method: "POST", body: form })
    const json = await res.json()
    if (res.ok && json.url) {
      setProfile(prev => ({ ...prev, [field]: json.url }))
    } else {
      setError(json.error ?? "Uppladdning misslyckades")
    }
    setUploading(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        displayName:   profile.displayName   || null,
        senderName:    profile.senderName    || null,
        senderEmail:   profile.senderEmail   || null,
        replyTo:       profile.replyTo       || null,
        pdfFooterText: profile.pdfFooterText || null,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    else setError(json.error ?? "Fel vid sparning")
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Laddar…</div>

  return (
    <div className="max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Varumärke</h1>
        <p className="mt-1 text-sm text-gray-500">Anpassa logotyp, färger och avsändarinformation.</p>
      </div>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <Section title="Logotyp">
        <LogoField
          label="Logotyp (ljust läge)"
          field="logoUrl"
          value={profile.logoUrl}
          uploading={uploading === "logoUrl"}
          inputRef={fileRefs.logoUrl}
          onUpload={f => uploadFile("logoUrl", f)}
          onClear={() => set("logoUrl", null)}
        />
        <LogoField
          label="Logotyp (mörkt läge)"
          field="logoDarkUrl"
          value={profile.logoDarkUrl}
          uploading={uploading === "logoDarkUrl"}
          inputRef={fileRefs.logoDarkUrl}
          onUpload={f => uploadFile("logoDarkUrl", f)}
          onClear={() => set("logoDarkUrl", null)}
        />
        <LogoField
          label="Favicon"
          field="faviconUrl"
          value={profile.faviconUrl}
          uploading={uploading === "faviconUrl"}
          inputRef={fileRefs.faviconUrl}
          onUpload={f => uploadFile("faviconUrl", f)}
          onClear={() => set("faviconUrl", null)}
        />
      </Section>

      {/* ── Display name ─────────────────────────────────────── */}
      <Section title="Visningsnamn">
        <Field label="Varumärkesnamn (syns i gränssnitt och e-post)">
          <input
            className={CLS}
            value={profile.displayName ?? ""}
            onChange={e => set("displayName", e.target.value)}
            placeholder="Mitt AB"
            maxLength={100}
          />
        </Field>
      </Section>

      {/* ── Colors ───────────────────────────────────────────── */}
      <Section title="Färger">
        <div className="grid grid-cols-3 gap-4">
          <ColorField label="Primärfärg"       value={profile.primaryColor   ?? "#4f46e5"} onChange={v => set("primaryColor",   v)} />
          <ColorField label="Accentfärg"       value={profile.accentColor    ?? "#6366f1"} onChange={v => set("accentColor",    v)} />
          <ColorField label="Text på primär"   value={profile.textOnPrimary  ?? "#ffffff"} onChange={v => set("textOnPrimary",  v)} />
        </div>
        <p className="mt-2 text-xs text-gray-400">Färgerna används i sidopanelen, e-postmallar och PDF-fakturor.</p>
      </Section>

      {/* ── Email ────────────────────────────────────────────── */}
      <Section title="E-post">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Avsändarnamn">
            <input className={CLS} value={profile.senderName ?? ""} onChange={e => set("senderName", e.target.value)} placeholder="Mitt AB" maxLength={100} />
          </Field>
          <Field label="Avsändaradress">
            <input className={CLS} type="email" value={profile.senderEmail ?? ""} onChange={e => set("senderEmail", e.target.value)} placeholder="faktura@mittab.se" />
          </Field>
        </div>
        <Field label="Svar-till-adress (valfri)">
          <input className={CLS} type="email" value={profile.replyTo ?? ""} onChange={e => set("replyTo", e.target.value)} placeholder="support@mittab.se" />
        </Field>
        <LogoField
          label="Logotyp i e-post"
          field="emailLogoUrl"
          value={profile.emailLogoUrl}
          uploading={uploading === "emailLogoUrl"}
          inputRef={fileRefs.emailLogoUrl}
          onUpload={f => uploadFile("emailLogoUrl", f)}
          onClear={() => set("emailLogoUrl", null)}
        />
        <p className="text-xs text-gray-400">För att skicka från en egen domän måste avsändaradressen vara verifierad via Resend.</p>
      </Section>

      {/* ── PDF ──────────────────────────────────────────────── */}
      <Section title="PDF-fakturor">
        <LogoField
          label="Logotyp på faktura-PDF"
          field="pdfLogoUrl"
          value={profile.pdfLogoUrl}
          uploading={uploading === "pdfLogoUrl"}
          inputRef={fileRefs.pdfLogoUrl}
          onUpload={f => uploadFile("pdfLogoUrl", f)}
          onClear={() => set("pdfLogoUrl", null)}
        />
        <Field label="PDF-accentfärg">
          <div className="flex items-center gap-3">
            <input type="color" value={profile.pdfAccentColor ?? "#4f46e5"} onChange={e => set("pdfAccentColor", e.target.value)} className="h-9 w-16 cursor-pointer rounded border border-gray-200 p-0.5" />
            <input className={`${CLS} flex-1`} value={profile.pdfAccentColor ?? "#4f46e5"} onChange={e => set("pdfAccentColor", e.target.value)} placeholder="#4f46e5" maxLength={7} />
          </div>
        </Field>
        <Field label="Sidfot (betalningsinformation, kontaktuppgifter)">
          <textarea
            className={`${CLS} min-h-[72px] resize-y`}
            value={profile.pdfFooterText ?? ""}
            onChange={e => set("pdfFooterText", e.target.value)}
            placeholder="Bankgiro: 1234-5678 · Org.nr: 556123-4567"
            maxLength={500}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={profile.pdfShowPoweredBy} onChange={e => set("pdfShowPoweredBy", e.target.checked)} className="rounded border-gray-300" />
          Visa "Skickat via Endoo" i sidfoten
        </label>
      </Section>

      {/* ── Agency white-label ───────────────────────────────── */}
      <Section title="Byrå — white-label">
        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={profile.applyToClients} onChange={e => set("applyToClients", e.target.checked)} className="mt-0.5 rounded border-gray-300" />
          <span>
            <span className="font-medium">Använd byrå-branding hos kunder</span>
            <span className="block text-xs text-gray-400 mt-0.5">Kunder utan egen profil ärver byråns logotyp, färger och avsändarinformation.</span>
          </span>
        </label>
        {profile.applyToClients && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-3">
            <input type="checkbox" checked={profile.allowClientOverride} onChange={e => set("allowClientOverride", e.target.checked)} className="rounded border-gray-300" />
            Tillåt kunder att åsidosätta byrå-branding med sin egen
          </label>
        )}
      </Section>

      {/* ── Actions ──────────────────────────────────────────── */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className={`${BTN_PRIMARY} px-5 py-2.5 text-sm font-medium`}
        >
          {saving ? "Sparar…" : "Spara ändringar"}
        </button>
        {saved && <span className="text-sm text-green-600">Sparat!</span>}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 border-b border-gray-100 pb-8">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-9 w-10 cursor-pointer rounded border border-gray-200 p-0.5 flex-shrink-0" />
        <input className={`${CLS} flex-1 min-w-0`} value={value} onChange={e => onChange(e.target.value)} placeholder="#4f46e5" maxLength={7} />
      </div>
    </Field>
  )
}

function LogoField({
  label, field, value, uploading, inputRef, onUpload, onClear,
}: {
  label: string
  field: UploadField
  value: string | null
  uploading: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (f: File) => void
  onClear: () => void
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative h-10 w-24 rounded border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
            <Image src={value} alt={label} fill className="object-contain p-1" unoptimized />
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`${BTN_SECONDARY} text-xs px-3 py-1.5`}
        >
          {uploading ? "Laddar upp…" : value ? "Byt bild" : "Ladda upp"}
        </button>
        {value && (
          <button type="button" onClick={onClear} className="text-xs text-red-500 hover:underline">
            Ta bort
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/webp,image/jpeg"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
        />
      </div>
    </Field>
  )
}
