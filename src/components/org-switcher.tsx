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
import { CHART } from "@/lib/analytics/chart-colors"

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
      className="flex items-center justify-between px-4 py-2 text-sm font-medium bg-amber-400 text-foreground"
    >
      <span>
        Du hanterar just nu: <strong>{session.impersonatingOrgSlug}</strong>
      </span>
      <button
        onClick={exitImpersonation}
        disabled={loading}
        className="bg-black/15 border-none rounded px-3 py-1 cursor-pointer font-semibold disabled:opacity-50"
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
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-transparent border rounded-md cursor-pointer font-semibold min-w-[180px]"
      >
        <span className="flex-1 text-left">{currentOrgName}</span>
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 min-w-[240px] bg-card border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Own accounts */}
          <div className="px-3 py-1.5 text-[0.7rem] text-muted-foreground font-semibold uppercase tracking-wide">
            Dina konton
          </div>

          {orgs.map((org) => (
            <div key={org.id}>
              <button
                onClick={() => switchOrg(org.id)}
                disabled={loading === org.id}
                className={`w-full flex items-center gap-2 px-3 py-2 border-none cursor-pointer text-left ${
                  activeOrg?.id === org.id ? "bg-muted" : "bg-transparent hover:bg-accent"
                } disabled:opacity-50`}
              >
                <OrgAvatar org={org} size={24} />
                <div>
                  <div className="font-medium text-sm text-foreground">{org.name}</div>
                  <div className="text-[0.7rem] text-muted-foreground">
                    {org.type === "agency" ? "Byrå" : "Kund"} · {roleLabel(org.role)}
                  </div>
                </div>
                {loading === org.id && <Spinner />}
              </button>

              {/* Agency: show managed clients inline */}
              {org.type === "agency" && org.clients && org.clients.length > 0 && (
                <div className="border-t">
                  <div className="px-3 py-1 pl-6 text-[0.7rem] text-muted-foreground font-semibold uppercase">
                    Kunder
                  </div>
                  {org.clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => impersonate(client.id)}
                      disabled={loading === client.id}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 pl-7 border-none cursor-pointer text-left ${
                        session?.impersonatingOrganizationId === client.id ? "bg-amber-50" : "bg-transparent hover:bg-accent"
                      } disabled:opacity-50`}
                    >
                      <OrgAvatar org={client} size={20} />
                      <div className="flex-1">
                        <div className="font-medium text-[0.8125rem] text-foreground">{client.name}</div>
                        {client.accessLevel !== "full" && (
                          <div className="text-[0.675rem] text-amber-500">
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
          className="fixed inset-0 z-40"
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
        fontSize: size * 0.45,
        fontWeight: 700,
        flexShrink: 0,
      }}
      className="text-white"
    >
      {org.name.charAt(0).toUpperCase()}
    </div>
  )
}

function Spinner() {
  return (
    <div
      className="border-2 border-border rounded-full flex-shrink-0"
      style={{
        width: 14,
        height: 14,
        borderTopColor: "var(--muted-foreground)",
        animation: "spin 0.6s linear infinite",
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
  const colors = [CHART.indigo, CHART.violet, CHART.pink, CHART.amber, CHART.emerald, CHART.blue, CHART.red]
  return colors[Math.abs(hash) % colors.length]
}
