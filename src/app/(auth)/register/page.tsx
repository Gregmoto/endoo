"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", orgName: "", orgType: "customer",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Något gick fel")
      setLoading(false)
      return
    }

    // Auto-login after registration
    await signIn("credentials", {
      email: form.email, password: form.password, redirect: false,
    })
    router.push(`/app/${data.orgSlug}`)
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-brand-600">Endoo</span>
        <p className="mt-1 text-sm text-gray-500">Skapa ett nytt konto</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Ditt namn" value={form.fullName} onChange={set("fullName")}
            placeholder="Anna Svensson" required />
          <Input label="E-post" type="email" value={form.email} onChange={set("email")}
            placeholder="anna@foretag.se" autoComplete="email" required />
          <Input label="Lösenord" type="password" value={form.password} onChange={set("password")}
            placeholder="Minst 8 tecken" autoComplete="new-password" minLength={8} required />

          <hr className="border-gray-100" />

          <Input label="Företagsnamn" value={form.orgName} onChange={set("orgName")}
            placeholder="Acme AB" required />
          <Select
            label="Kontotyp"
            value={form.orgType}
            onChange={set("orgType")}
            options={[
              { value: "customer", label: "Kund — fakturerar egna kunder" },
              { value: "agency",   label: "Byrå — hanterar flera kunders fakturering" },
            ]}
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Skapa konto
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Har du redan konto?{" "}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            Logga in
          </Link>
        </p>
      </div>
    </div>
  )
}
