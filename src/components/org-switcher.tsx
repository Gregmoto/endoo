"use client"

/**
 * OrgSwitcher — account switching dropdown
 *
 * Shows:
 *   - All orgs the user is a member of (own accounts)
 *   - For agency orgs: a sub-section listing managed clients
 *   - A banner when impersonating (with exit button)
 *
 * Wires up to:
 *   POST /api/auth/switch-org        — switch own org
 *   POST /api/auth/impersonate       — enter client context
 *   POST /api/auth/exit-impersonation — return to agency
 */

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useOrg } from "@/hooks/use-org"
import { useState } from "react"

// ─────────────────────────────────────────────
// Types (returned by /api/orgs/mine — created later)
// ─────────────────────────────────────────────

interface OrgOption {
  id: string
  slug: string
  name: string
  type: "agency" | "customer"
  logoUrl?: string | null
  role: string
  clients?: ClientOption[]
}

interface ClientOption {
  id: string
  slug: string
  name: string
  logoUrl?: string | null
  accessLevel: "full" | "invoicing_only" | "read_only"
}

interface OrgSwitcherProps {
  orgs: OrgOption[]
}

// ─────────────────────────────────────────────
// Impersonation banner
// Shown at the top of the app when acting as a client
// ─────────────────────────────────────────────

export function ImpersonationBanner() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!session?.impersonatingOrganizationId) return null

  async function exitImpersonation() {
    setLoading(true)
    const res = await fetch("/api/auth/exit-impersonation", { method: "POST" })
    const json = await res.json()
    if (json.slug) {
      router.push(`/app/${json.slug}`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div
      role="alert"
      style={{
        background: "#f59e0b",
        color: "#000",
        padding: "0.5rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      <span>
        Du hanterar just nu: <strong>{session.impersonatingOrgSlug}</strong>
      </span>
      <button
        onClick={exitImpersonation}
        disabled={loading}
        style={{
          background: "rgba(0,0,0,0.15)",
          border: "none",
          borderRadius: "4px",
          padding: "0.25rem 0.75rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {loading ? "Lämnar…" : "← Tillbaka till byrån"}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// OrgSwitcher dropdown
// ─────────────────────────────────────────────

export function OrgSwitcher({ orgs }: OrgSwitcherProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { activeOrg } = useOrg()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  async function switchOrg(orgId: string) {
    setLoading(orgId)
    setOpen(false)
    const res = await fetch("/api/auth/switch-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId }),
    })
    const json = await res.json()
    if (json.slug) {
      router.push(`/app/${json.slug}`)
      router.refresh()
    }
    setLoading(null)
  }

  async function impersonate(clientId: string) {
    setLoading(clientId)
    setOpen(false)
    const res = await fetch("/api/auth/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientOrganizationId: clientId }),
    })
    const json = await res.json()
    if (json.slug) {
      router.push(`/app/${json.slug}`)
      router.refresh()
    }
    setLoading(null)
  }

  const currentOrgName = activeOrg?.name ?? session?.activeOrgSlug ?? "Välj konto"

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          background: "transparent",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
          minWidth: "180px",
        }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{currentOrgName}</span>
        <span style={{ fontSize: "0.75rem" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "240px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {/* Own accounts */}
          <div style={{ padding: "0.375rem 0.75rem", fontSize: "0.7rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Dina konton
          </div>

          {orgs.map((org) => (
            <div key={org.id}>
              <button
                onClick={() => switchOrg(org.id)}
                disabled={loading === org.id}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: activeOrg?.id === org.id ? "#f3f4f6" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <OrgAvatar org={org} size={24} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{org.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                    {org.type === "agency" ? "Byrå" : "Kund"} · {roleLabel(org.role)}
                  </div>
                </div>
                {loading === org.id && <Spinner />}
              </button>

              {/* Agency: show managed clients inline */}
              {org.type === "agency" && org.clients && org.clients.length > 0 && (
                <div style={{ borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ padding: "0.25rem 0.75rem 0.25rem 1.5rem", fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>
                    Kunder
                  </div>
                  {org.clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => impersonate(client.id)}
                      disabled={loading === client.id}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.375rem 0.75rem 0.375rem 1.75rem",
                        background: session?.impersonatingOrganizationId === client.id ? "#fef3c7" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <OrgAvatar org={client} size={20} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.8125rem" }}>{client.name}</div>
                        {client.accessLevel !== "full" && (
                          <div style={{ fontSize: "0.675rem", color: "#f59e0b" }}>
                            {accessLevelLabel(client.accessLevel)}
                          </div>
                        )}
                      </div>
                      {loading === client.id && <Spinner />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Close on outside click */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function OrgAvatar({ org, size }: { org: { name: string; logoUrl?: string | null }; size: number }) {
  if (org.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={org.logoUrl}
        alt={org.name}
        width={size}
        height={size}
        style={{ borderRadius: "4px", objectFit: "cover" }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "4px",
        background: stringToColor(org.name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.45,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {org.name.charAt(0).toUpperCase()}
    </div>
  )
}

function Spinner() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: "2px solid #e5e7eb",
        borderTopColor: "#6b7280",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
        flexShrink: 0,
      }}
    />
  )
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: "Ägare",
    admin: "Admin",
    member: "Medlem",
    viewer: "Läsare",
  }
  return map[role] ?? role
}

function accessLevelLabel(level: string): string {
  const map: Record<string, string> = {
    invoicing_only: "Fakturering",
    read_only: "Skrivskyddad",
  }
  return map[level] ?? level
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"]
  return colors[Math.abs(hash) % colors.length]
}
