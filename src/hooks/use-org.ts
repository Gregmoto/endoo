"use client"

/**
 * useOrg — client-side hook for current org context
 *
 * Returns:
 *   activeOrg       — the org the user is currently acting in
 *   impersonating   — set when agency is acting as a client
 *   isImpersonating — boolean shortcut
 *   isAgency        — whether the active (own) org is an agency
 *
 * The org data comes from the session (populated by auth callbacks).
 * Extended org data (name, logo, etc.) is fetched from /api/orgs/current.
 */

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface OrgInfo {
  id: string
  slug: string
  name: string
  type: "agency" | "customer"
  logoUrl: string | null
  plan: string
}

interface UseOrgResult {
  activeOrg: OrgInfo | null
  impersonating: OrgInfo | null
  isImpersonating: boolean
  isAgency: boolean
  loading: boolean
}

export function useOrg(): UseOrgResult {
  const { data: session, status } = useSession()
  const [activeOrg, setActiveOrg] = useState<OrgInfo | null>(null)
  const [impersonating, setImpersonating] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    if (!session?.activeOrganizationId) {
      setLoading(false)
      return
    }

    async function loadOrg() {
      setLoading(true)
      try {
        const res = await fetch("/api/orgs/current")
        if (res.ok) {
          const data = await res.json()
          setActiveOrg(data.activeOrg ?? null)
          setImpersonating(data.impersonatingOrg ?? null)
        }
      } finally {
        setLoading(false)
      }
    }

    loadOrg()
  }, [session?.activeOrganizationId, session?.impersonatingOrganizationId, status])

  return {
    activeOrg,
    impersonating,
    isImpersonating: !!session?.impersonatingOrganizationId,
    isAgency: activeOrg?.type === "agency",
    loading,
  }
}

// ─────────────────────────────────────────────
// usePermissions — client-side permission check
// Server is the authoritative source; this is for
// hiding/showing UI elements only — never for security.
// ─────────────────────────────────────────────

import type { Permission } from "@/lib/rbac/permissions"

interface UsePermissionsResult {
  can: (permission: Permission) => boolean
  permissions: Set<Permission>
  loading: boolean
}

export function usePermissions(): UsePermissionsResult {
  const { data: session } = useSession()
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.activeOrganizationId) return

    async function loadPermissions() {
      const res = await fetch("/api/auth/permissions")
      if (res.ok) {
        const data = await res.json()
        setPermissions(new Set(data.permissions as Permission[]))
      }
      setLoading(false)
    }

    loadPermissions()
  }, [session?.activeOrganizationId, session?.impersonatingOrganizationId])

  return {
    can: (permission: Permission) => permissions.has(permission),
    permissions,
    loading,
  }
}
