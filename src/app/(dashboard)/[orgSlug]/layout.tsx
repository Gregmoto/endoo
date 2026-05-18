import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNavBar } from "@/components/layout/MobileNavBar"
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner"
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

  // Resolve agency name when impersonating
  let agencyName: string | null = null
  let agencySlug: string | null = null
  const isImpersonating = session.impersonatingOrganizationId === org.id

  const [agencyOrg, branding] = await Promise.all([
    isImpersonating && session.activeOrgSlug
      ? prisma.organization.findUnique({ where: { slug: session.activeOrgSlug }, select: { name: true, slug: true } })
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" style={cssVars}>
      {isImpersonating && agencyName && agencySlug && (
        <ImpersonationBanner agencyName={agencyName} agencySlug={agencySlug} clientSlug={orgSlug} />
      )}

      <Sidebar
        orgSlug={org.slug}
        orgName={org.name}
        orgType={org.type as "agency" | "customer"}
        userEmail={session.user.email}
        orgPlan={org.plan}
        isImpersonating={isImpersonating}
        logoUrl={branding.logoUrl}
        brandingDisplayName={branding.displayName}
      />

      <AiShell>
        {/*
          ml-0 on mobile (sidebar is hidden),
          md:ml-56 on desktop (sidebar is fixed 224px).
          pt-12 = clearance for the mobile top bar (h-12).
          pb-16 md:pb-0 = clearance for the mobile bottom nav.
        */}
        <main className={[
          "ml-0 md:ml-56",
          "pt-12",
          "pb-20 md:pb-0",
          isImpersonating ? "mt-10" : "",
        ].join(" ")}>
          {children}
        </main>
      </AiShell>

      {/* Mobile bottom tab bar */}
      <MobileNavBar orgSlug={org.slug} />
    </div>
    </SearchProvider>
  )
}
