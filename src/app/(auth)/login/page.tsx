"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") ?? "/app"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email, password, redirect: false,
    })

    if (res?.error) {
      setError("Fel e-post eller lösenord")
      setLoading(false)
      return
    }

    router.push(callbackUrl)
  }

  return (
    <div className="w-full max-w-sm px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-brand-600">Endoo</span>
        <p className="mt-1 text-sm text-gray-500">Logga in på ditt konto</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-post"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@exempel.se"
            autoComplete="email"
            required
          />
          <Input
            label="Lösenord"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Logga in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Inget konto?{" "}
          <Link href="/register" className="text-brand-600 font-medium hover:underline">
            Skapa konto
          </Link>
        </p>
      </div>
    </div>
  )
}
