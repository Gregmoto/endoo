"use client"

/**
 * /portal/[orgSlug]/profile/sessions
 * Trusted devices management for portal contacts.
 */

import { useState, useEffect, useCallback } from "react"
import { useParams }                         from "next/navigation"

interface TrustedDevice {
  id:          string
  deviceId:    string
  label:       string | null
  ipPrefix:    string
  userAgent:   string
  lastUsedAt:  string
  createdAt:   string
}

export default function SessionsPage() {
  const params  = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [devices,  setDevices]  = useState<TrustedDevice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [trusting, setTrusting] = useState(false)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${orgSlug}/sessions`)
      if (!res.ok) throw new Error("Kunde inte hämta enheter")
      const data = await res.json()
      setDevices(data.devices ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel")
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  useEffect(() => { fetchDevices() }, [fetchDevices])

  async function trustDevice() {
    setTrusting(true)
    try {
      const res = await fetch(`/api/portal/${orgSlug}/sessions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ label: "Den här enheten" }),
      })
      if (!res.ok) throw new Error("Misslyckades")
      await fetchDevices()
    } catch {
      setError("Kunde inte lägga till enhet")
    } finally {
      setTrusting(false)
    }
  }

  async function revoke(id: string) {
    setRevoking(id)
    try {
      const res = await fetch(`/api/portal/${orgSlug}/sessions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Misslyckades")
      setDevices(d => d.filter(x => x.id !== id))
    } catch {
      setError("Kunde inte ta bort enhet")
    } finally {
      setRevoking(null)
    }
  }

  return (
    <div style={page}>
      <div style={header}>
        <h1 style={h1}>Betrodda enheter</h1>
        <button style={addBtn} onClick={trustDevice} disabled={trusting}>
          {trusting ? "Lägger till…" : "+ Lita på den här enheten"}
        </button>
      </div>
      <p style={desc}>
        Betrodda enheter hoppar över säkerhetskod-verifiering vid inloggning från samma nätverksplats.
      </p>
      {error && <p style={errStyle}>{error}</p>}
      {loading ? (
        <p style={desc}>Laddar…</p>
      ) : devices.length === 0 ? (
        <p style={desc}>Inga betrodda enheter.</p>
      ) : (
        <ul style={list}>
          {devices.map(d => (
            <li key={d.id} style={item}>
              <div style={itemMain}>
                <div style={itemLabel}>{d.label ?? "Enhet"}</div>
                <div style={itemMeta}>{d.userAgent.slice(0, 80)}</div>
                <div style={itemMeta}>IP-prefix: {d.ipPrefix} · Senast använd: {new Date(d.lastUsedAt).toLocaleDateString("sv-SE")}</div>
              </div>
              <button
                style={revokeBtn}
                onClick={() => revoke(d.id)}
                disabled={revoking === d.id}
              >
                {revoking === d.id ? "…" : "Ta bort"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const page:     React.CSSProperties = { maxWidth: 640, margin: "0 auto", padding: "32px 16px" }
const header:   React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }
const h1:       React.CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700, color: "var(--foreground)" }
const desc:     React.CSSProperties = { fontSize: 14, color: "var(--muted-foreground)", margin: "0 0 20px" }
const list:     React.CSSProperties = { listStyle: "none", padding: 0, margin: 0 }
const item:     React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--muted)" }
const itemMain: React.CSSProperties = { flex: 1 }
const itemLabel:React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--foreground)" }
const itemMeta: React.CSSProperties = { fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }
const addBtn:   React.CSSProperties = { padding: "8px 16px", background: "var(--primary)", color: "var(--background)", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" }
const revokeBtn:React.CSSProperties = { padding: "6px 12px", background: "none", border: "1px solid #fca5a5", color: "var(--destructive)", borderRadius: 6, fontSize: 12, cursor: "pointer" } // audit-ok for border color (status-specific danger tint)
const errStyle: React.CSSProperties = { color: "var(--destructive)", fontSize: 13, marginBottom: 12 }
