/**
 * Portal layout — Server Component.
 * Fetches org branding and renders the portal shell.
 * The portal_session cookie is checked per-page (not here) so the
 * login page can render without auth.
 */

import { prisma }          from "@/lib/prisma"
import { resolveBranding } from "@/lib/branding/resolver"
import { notFound }        from "next/navigation"
import type { ReactNode }  from "react"

export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode
  params:   Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  const org = await prisma.organization.findUnique({
    where:  { slug: orgSlug },
    select: { id: true, name: true },
  })
  if (!org) notFound()

  const branding = await resolveBranding(org.id)
  const color    = branding.primaryColor ?? "#4f46e5" // audit-ok: branding color injected as CSS variable
  const name     = branding.displayName  ?? org.name

  return (
    <div style={{ minHeight: "100vh", background: "var(--muted)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Top bar */}
      <header style={{ background: color, padding: "0 24px", height: 56, display: "flex", alignItems: "center" }}>
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt={name} style={{ height: 32, objectFit: "contain" }} />
        ) : (
          <span style={{ color: "var(--background)", fontWeight: 700, fontSize: 18 }}>{name}</span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>Kundportal</span> {/* audit-ok — semi-transparent white over dynamic brand color header */}
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "24px", fontSize: 11, color: "var(--muted-foreground)" }}>
        Kundportal via Endoo
      </footer>
    </div>
  )
}
