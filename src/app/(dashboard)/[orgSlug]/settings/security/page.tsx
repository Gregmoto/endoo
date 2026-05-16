"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SecuritySettingsPage() {
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSaved, setPwSaved] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Lösenorden matchar inte")
      return
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("Lösenordet måste vara minst 8 tecken")
      return
    }
    setPwSaving(true)
    setPwError("")
    const res = await fetch("/api/settings/security/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      }),
    })
    if (res.ok) {
      setPwSaved(true)
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setTimeout(() => setPwSaved(false), 3000)
    } else {
      const d = await res.json()
      setPwError(d.error ?? "Något gick fel")
    }
    setPwSaving(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Säkerhet</h1>
        <p className="text-sm text-gray-500 mt-1">Lösenord och tvåfaktorsautentisering</p>
      </div>

      <div className="space-y-6">
        {/* Byt lösenord */}
        <Card>
          <CardHeader><CardTitle>Byt lösenord</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Field label="Nuvarande lösenord">
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                  className={cls}
                  autoComplete="current-password"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nytt lösenord">
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                    required
                    minLength={8}
                    placeholder="Minst 8 tecken"
                    className={cls}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Bekräfta nytt lösenord">
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                    className={cls}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              {pwError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>
              )}
              <div className="flex items-center gap-4">
                <Button type="submit" loading={pwSaving} size="sm">Byt lösenord</Button>
                {pwSaved && <span className="text-sm text-green-600 font-medium">✓ Lösenord ändrat</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader><CardTitle>Tvåfaktorsautentisering (2FA)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Ej aktiverat</p>
                <p className="text-xs text-gray-500 mt-1">
                  2FA ökar kontosäkerheten — kräver en engångskod vid inloggning utöver lösenordet.
                </p>
              </div>
              <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-lg">Fas 4</span>
            </div>
          </CardContent>
        </Card>

        {/* Session info */}
        <Card>
          <CardHeader><CardTitle>Sessioner</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Endoo använder JWT-baserade sessioner. Varje enhet håller sin token lokalt i webbläsaren.
              Logga ut från enheter du inte längre använder för att avsluta sessionen.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Denna session</p>
                <p className="text-xs text-gray-500 mt-0.5">Aktiv</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Inloggad</span>
            </div>
          </CardContent>
        </Card>
      </div>
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
