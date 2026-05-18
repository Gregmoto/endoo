"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useParams } from "next/navigation"

type EmailForm = {
  senderName: string
  senderAddress: string
  replyTo: string
  invoiceSubject: string
  invoiceBody: string
  reminderSubject: string
  reminderBody: string
}

type DomainVerification = {
  id: string
  domain: string
  status: string
  dnsRecords: Array<{ type: string; name: string; value: string }>
  verifiedAt: string | null
} | null

const VARS = [
  "{{invoice_number}}", "{{org_name}}", "{{recipient_name}}",
  "{{total}}", "{{currency}}", "{{due_date}}",
]

export default function EmailSettingsPage() {
  const params = useParams<{ orgSlug: string }>()
  const [form, setForm] = useState<EmailForm>({
    senderName: "", senderAddress: "", replyTo: "",
    invoiceSubject: "", invoiceBody: "",
    reminderSubject: "", reminderBody: "",
  })
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState("")
  const [testTo,      setTestTo]      = useState("")
  const [testSending, setTestSending] = useState(false)
  const [testResult,  setTestResult]  = useState<{ ok?: boolean; error?: string } | null>(null)
  const [domain,      setDomain]      = useState<DomainVerification>(null)
  const [newDomain,   setNewDomain]   = useState("")
  const [addingDomain, setAddingDomain] = useState(false)
  const [verifying,   setVerifying]   = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/email").then(r => r.json()),
      fetch("/api/settings/email/domain").then(r => r.ok ? r.json() : null),
    ]).then(([emailData, domainData]) => {
      setForm(emailData)
      if (domainData?.domain) setDomain(domainData)
      setLoading(false)
    })
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

  async function sendTest() {
    if (!testTo) return
    setTestSending(true); setTestResult(null)
    const res = await fetch("/api/settings/email/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo }),
    })
    const d = await res.json()
    setTestResult(res.ok ? { ok: true } : { error: d.error ?? "Fel" })
    setTestSending(false)
  }

  async function addDomain() {
    if (!newDomain) return
    setAddingDomain(true)
    const res = await fetch("/api/settings/email/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: newDomain }),
    })
    const d = await res.json()
    if (res.ok) setDomain(d)
    else setError(d.error ?? "Kunde inte lägga till domän")
    setAddingDomain(false)
  }

  async function verifyDomain() {
    setVerifying(true)
    const res = await fetch("/api/settings/email/domain/verify", { method: "POST" })
    const d = await res.json()
    if (res.ok) setDomain(d)
    else setError(d.error ?? "Verifiering misslyckades")
    setVerifying(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">E-postinställningar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Används när fakturor och påminnelser skickas via e-post
          </p>
        </div>
        <Link
          href={`/${params.orgSlug}/settings/email/logs`}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span className="text-base leading-none">◷</span>
          E-postlogg
        </Link>
      </div>

      {/* Custom domain */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Anpassad avsändarsdomän</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!domain ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Konfigurera en egen domän för bättre deliverability och avsändarautentisering (DKIM/SPF/DMARC).
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="mail.dittforetag.se"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  className={cls}
                />
                <Button onClick={addDomain} loading={addingDomain} variant="outline">
                  Lägg till
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{domain.domain}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Status:{" "}
                    <span className={
                      domain.status === "verified" ? "text-green-600 dark:text-green-400 font-medium" :
                      domain.status === "failed"   ? "text-red-600 dark:text-red-400 font-medium" :
                      "text-amber-600 dark:text-amber-400 font-medium"
                    }>
                      {domain.status === "verified" ? "✓ Verifierad" :
                       domain.status === "failed"   ? "✗ Misslyckades" :
                       "⏳ Väntar"}
                    </span>
                  </p>
                </div>
                {domain.status !== "verified" && (
                  <Button size="sm" variant="outline" onClick={verifyDomain} loading={verifying}>
                    Verifiera nu
                  </Button>
                )}
              </div>

              {domain.dnsRecords.length > 0 && domain.status !== "verified" && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Lägg till dessa DNS-poster hos din domänregistrar:
                  </p>
                  <div className="space-y-2">
                    {domain.dnsRecords.map((r, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-xs space-y-1">
                        <div className="flex gap-4">
                          <span className="text-gray-400 dark:text-gray-500 w-12">Typ</span>
                          <span className="text-gray-900 dark:text-gray-100">{r.type}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-gray-400 dark:text-gray-500 w-12">Namn</span>
                          <span className="text-gray-900 dark:text-gray-100 break-all">{r.name}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-gray-400 dark:text-gray-500 w-12">Värde</span>
                          <span className="text-gray-900 dark:text-gray-100 break-all">{r.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
          </CardContent>
        </Card>

        {/* Test-skicka */}
        <Card>
          <CardHeader><CardTitle>Testutskick</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="din@email.se"
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                className={cls}
              />
              <Button type="button" variant="outline" onClick={sendTest} loading={testSending} disabled={!testTo}>
                Skicka test
              </Button>
            </div>
            {testResult?.ok && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">✓ Testmail skickat</p>
            )}
            {testResult?.error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{testResult.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Variabler */}
        <Card>
          <CardHeader><CardTitle>Tillgängliga variabler</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VARS.map(v => (
                <code key={v} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded font-mono">{v}</code>
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

        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">{error}</p>}
        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>Spara ändringar</Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Sparat</span>}
        </div>
      </form>
    </div>
  )
}

const cls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
