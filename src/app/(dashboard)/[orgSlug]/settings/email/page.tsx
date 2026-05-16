"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type EmailForm = {
  senderName: string
  senderAddress: string
  replyTo: string
  invoiceSubject: string
  invoiceBody: string
  reminderSubject: string
  reminderBody: string
}

const VARS = ["{{invoice_number}}", "{{org_name}}", "{{recipient_name}}", "{{total}}", "{{currency}}", "{{due_date}}"]

export default function EmailSettingsPage() {
  const [form, setForm] = useState<EmailForm>({
    senderName: "", senderAddress: "", replyTo: "",
    invoiceSubject: "", invoiceBody: "",
    reminderSubject: "", reminderBody: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/settings/email")
      .then(r => r.json())
      .then(data => { setForm(data); setLoading(false) })
  }, [])

  function set(key: keyof EmailForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError("")
    const res = await fetch("/api/settings/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await res.json(); setError(d.error ?? "Något gick fel") }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">E-postinställningar</h1>
        <p className="text-sm text-gray-500 mt-1">Används när fakturor och påminnelser skickas via e-post</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avsändare */}
        <Card>
          <CardHeader><CardTitle>Avsändare</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Avsändarnamn">
              <input value={form.senderName} onChange={set("senderName")} className={cls} placeholder="Mitt Företag AB" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Avsändar-e-post">
                <input type="email" value={form.senderAddress} onChange={set("senderAddress")} className={cls} placeholder="faktura@foretag.se" />
              </Field>
              <Field label="Svara-till (valfritt)">
                <input type="email" value={form.replyTo} onChange={set("replyTo")} className={cls} placeholder="info@foretag.se" />
              </Field>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>OBS:</strong> E-postutskick kräver en konfigurerad e-posttjänst (Resend). Tillgängligt i fas 4.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Variabler */}
        <Card>
          <CardHeader><CardTitle>Tillgängliga variabler</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VARS.map(v => (
                <code key={v} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">{v}</code>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fakturamall */}
        <Card>
          <CardHeader><CardTitle>Fakturamall</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Ämnesrad">
              <input value={form.invoiceSubject} onChange={set("invoiceSubject")} className={cls} />
            </Field>
            <Field label="Brödtext">
              <textarea
                value={form.invoiceBody}
                onChange={set("invoiceBody")}
                rows={6}
                className={cls + " resize-none font-mono text-xs"}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Påminnelsemall */}
        <Card>
          <CardHeader><CardTitle>Påminnelsemall</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Ämnesrad">
              <input value={form.reminderSubject} onChange={set("reminderSubject")} className={cls} />
            </Field>
            <Field label="Brödtext">
              <textarea
                value={form.reminderBody}
                onChange={set("reminderBody")}
                rows={6}
                className={cls + " resize-none font-mono text-xs"}
              />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
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
