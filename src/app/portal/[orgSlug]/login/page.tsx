"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

export default function PortalLoginPage() {
  const params  = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [email,  setEmail]  = useState("")
  const [sent,   setSent]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${orgSlug}/auth/send`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Något gick fel")
      } else {
        setSent(true)
      }
    } catch {
      setError("Nätverksfel")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={card}>
        <h1 style={h1}>Kolla din e-post</h1>
        <p style={body}>Vi har skickat en inloggningslänk till <strong>{email}</strong>. Länken är giltig i 10 minuter.</p>
        <p style={{ ...body, color: "#6b7280" }}>Inget mail? Kontrollera skräpposten eller försök igen.</p>
        <button style={link} onClick={() => setSent(false)}>Försök igen</button>
      </div>
    )
  }

  return (
    <div style={card}>
      <h1 style={h1}>Logga in på kundportalen</h1>
      <p style={body}>Ange din e-postadress för att få en inloggningslänk.</p>
      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <label style={label}>E-postadress</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="din@epost.se"
          style={input}
        />
        {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btn}>
          {loading ? "Skickar…" : "Skicka inloggningslänk"}
        </button>
      </form>
    </div>
  )
}

const card: React.CSSProperties  = { background: "#fff", borderRadius: 12, padding: "40px 36px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", maxWidth: 440, margin: "0 auto" }
const h1: React.CSSProperties    = { margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#111827" }
const body: React.CSSProperties  = { margin: "0 0 8px", fontSize: 14, color: "#374151", lineHeight: 1.6 }
const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }
const btn: React.CSSProperties   = { marginTop: 16, width: "100%", padding: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }
const link: React.CSSProperties  = { background: "none", border: "none", color: "#4f46e5", cursor: "pointer", fontSize: 14, padding: 0, textDecoration: "underline" }
