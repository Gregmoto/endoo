"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5"

export default function OnboardingPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name:      "",
    orgNumber: "",
    type:      "customer" as "customer" | "agency",
    locale:    "sv-SE",
    currency:  "SEK",
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/onboarding", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Något gick fel. Försök igen.")
      setLoading(false)
      return
    }

    const { orgSlug } = await res.json()
    // Hard navigate so the updated JWT cookie is picked up
    window.location.href = `/${orgSlug}/invoices`
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-extrabold text-indigo-600 tracking-tight">endoo</span>
          <p className="mt-3 text-gray-500 text-sm">Välkommen! Skapa ditt konto för att komma igång.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Berätta om ditt företag</h1>

          <form onSubmit={submit} className="space-y-5">
            {/* Company name */}
            <div>
              <label className={labelCls}>Företagsnamn *</label>
              <input
                required
                value={form.name}
                onChange={set("name")}
                className={inputCls}
                placeholder="Acme AB"
              />
            </div>

            {/* Org number */}
            <div>
              <label className={labelCls}>Organisationsnummer</label>
              <input
                value={form.orgNumber}
                onChange={set("orgNumber")}
                className={inputCls}
                placeholder="556000-0000"
              />
            </div>

            {/* Account type */}
            <div>
              <label className={labelCls}>Kontotyp *</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "customer", label: "Konsult / Frilans", desc: "Fakturerar dina egna kunder" },
                  { value: "agency",   label: "Byrå",              desc: "Hanterar fakturering åt flera kunder" },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={`relative flex flex-col gap-1 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      form.type === opt.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={opt.value}
                      checked={form.type === opt.value}
                      onChange={set("type")}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                    <span className="text-xs text-gray-500 leading-snug">{opt.desc}</span>
                    {form.type === opt.value && (
                      <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Locale + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Språk</label>
                <select value={form.locale} onChange={set("locale")} className={inputCls}>
                  <option value="sv-SE">Svenska</option>
                  <option value="en-US">English</option>
                  <option value="nb-NO">Norsk</option>
                  <option value="da-DK">Dansk</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Valuta</label>
                <select value={form.currency} onChange={set("currency")} className={inputCls}>
                  {["SEK", "EUR", "USD", "NOK", "DKK", "GBP"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Skapar konto…" : "Kom igång →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Du kan ändra dessa uppgifter senare under Inställningar.
        </p>

        <div className="text-center mt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Logga ut
          </button>
        </div>
      </div>
    </main>
  )
}
