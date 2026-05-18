"use client"

/**
 * /portal/[orgSlug]/auth/verify
 * Shown when the magic-link verify detects an IP mismatch.
 * The user enters the 6-digit code sent to their email.
 */

import { useState }    from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Suspense }    from "react"

function VerifyCodeForm() {
  const params       = useParams<{ orgSlug: string }>()
  const orgSlug      = params.orgSlug
  const searchParams = useSearchParams()
  const token        = searchParams.get("token") ?? ""
  const router       = useRouter()

  const [code,    setCode]    = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${orgSlug}/auth/verify-code`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Felaktig kod")
      } else {
        router.push(data.redirect ?? `/portal/${orgSlug}`)
      }
    } catch {
      setError("Nätverksfel")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={card}>
      <h1 style={h1}>Verifiera din identitet</h1>
      <p style={body}>
        Du loggar in från en ny plats. Vi har skickat en 6-siffrig kod till din e-postadress.
      </p>
      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <label style={labelStyle}>Säkerhetskod</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          style={inputStyle}
          autoFocus
        />
        {error && <p style={{ color: "var(--destructive)", fontSize: 13, marginTop: 8 }}>{error}</p>}
        <button type="submit" disabled={loading || code.length < 6} style={btn}>
          {loading ? "Verifierar…" : "Verifiera"}
        </button>
      </form>
      <p style={{ ...body, marginTop: 16, color: "var(--muted-foreground)", fontSize: 12 }}>
        Koden är giltig i 10 minuter. Avsändare: noreply@mail.endoo.se
      </p>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyCodeForm />
    </Suspense>
  )
}

const card:       React.CSSProperties = { background: "var(--card)", borderRadius: 12, padding: "40px 36px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", maxWidth: 440, margin: "0 auto" }
const h1:         React.CSSProperties = { margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--foreground)" }
const body:       React.CSSProperties = { margin: "0 0 8px", fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 20, fontFamily: "monospace", letterSpacing: 8, textAlign: "center", outline: "none" }
const btn:        React.CSSProperties = { marginTop: 16, width: "100%", padding: "12px", background: "var(--primary)", color: "var(--background)", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }
