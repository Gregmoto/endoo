"use client"

import { use, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [scenario, setScenario] = useState<"existing" | "new">("existing")
  const [form, setForm] = useState({ fullName: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const body = scenario === "existing"
      ? { scenario: "existing", token }
      : { scenario: "new", token, ...form }

    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Något gick fel")
      setLoading(false)
      return
    }

    if (scenario === "new") {
      await signIn("credentials", {
        email: data.email, password: form.password, redirect: false,
      })
    }
    router.push(`/${data.orgSlug}`)
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-indigo-600">Endoo</span>
        <p className="mt-1 text-sm text-gray-500">Du har blivit inbjuden</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex rounded-lg border border-gray-200 p-1 mb-6">
          {(["existing", "new"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setScenario(s)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                scenario === s ? "bg-indigo-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}>
              {s === "existing" ? "Jag har konto" : "Nytt konto"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {scenario === "new" && (
            <>
              <Input label="Ditt namn" value={form.fullName} onChange={set("fullName")}
                placeholder="Anna Svensson" required />
              <Input label="Välj lösenord" type="password" value={form.password}
                onChange={set("password")} placeholder="Minst 8 tecken" minLength={8} required />
            </>
          )}
          {scenario === "existing" && (
            <p className="text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg">
              Logga in med ditt befintliga konto för att acceptera inbjudan.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Acceptera inbjudan
          </Button>
        </form>
      </div>
    </div>
  )
}
