import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner"
import { TopBar } from "@/components/navigation/TopBar"
import { AiShell } from "@/components/ai/AiShell"
import { SearchProvider } from "@/components/search/SearchProvider"
import { resolveBranding } from "@/lib/branding/resolver"

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, type: true, slug: true, isActive: true, plan: true },
  })

  if (!org || !org.isActive) redirect("/")

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: org.id, userId: session.user.id },
    },
  })

  const canAccess =
    membership?.deletedAt === null ||
    session.impersonatingOrganizationId === org.id ||
    session.user.isPlatformAdmin

  if (!canAccess) redirect("/")

  let agencyName: string | null = null
  let agencySlug: string | null = null
  const isImpersonating = session.impersonatingOrganizationId === org.id

  const [agencyOrg, branding] = await Promise.all([
    isImpersonating && session.activeOrgSlug
      ? prisma.organization.findUnique({
          where: { slug: session.activeOrgSlug },
          select: { name: true, slug: true },
        })
      : Promise.resolve(null),
    resolveBranding(org.id),
  ])

  if (agencyOrg) {
    agencyName = agencyOrg.name
    agencySlug = agencyOrg.slug
  }

  const cssVars = {
    "--brand-primary": branding.primaryColor,
    "--brand-accent":  branding.accentColor,
  } as React.CSSProperties

  return (
    <SearchProvider orgSlug={org.slug} orgId={org.id}>
      <div className="min-h-screen bg-background" style={cssVars}>

        {/* Sticky header: impersonation banner (if active) + top bar */}
        <header className="sticky top-0 z-40 flex flex-col bg-background">
          {isImpersonating && agencyName && agencySlug && (
            <ImpersonationBanner
              agencyName={agencyName}
              agencySlug={agencySlug}
              clientSlug={orgSlug}
            />
          )}
          <TopBar
            orgSlug={org.slug}
            orgName={org.name}
            orgType={org.type as "agency" | "customer"}
            orgId={org.id}
            userEmail={session.user.email ?? ""}
            userName={session.user.name}
            orgPlan={org.plan}
            logoUrl={branding.logoUrl}
            brandingDisplayName={branding.displayName}
          />
        </header>

        {/* Skip link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:border focus:border-border focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Hoppa till innehåll
        </a>

        <AiShell>
          <main id="main-content">
            {children}
          </main>
        </AiShell>
      </div>
    </SearchProvider>
  )
}
