import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner"

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
    select: { id: true, name: true, type: true, slug: true, isActive: true },
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

  if (isImpersonating && session.activeOrgSlug) {
    const agencyOrg = await prisma.organization.findUnique({
      where: { slug: session.activeOrgSlug },
      select: { name: true, slug: true },
    })
    agencyName = agencyOrg?.name ?? null
    agencySlug = agencyOrg?.slug ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isImpersonating && agencyName && agencySlug && (
        <ImpersonationBanner agencyName={agencyName} agencySlug={agencySlug} />
      )}
      <Sidebar
        orgSlug={org.slug}
        orgName={org.name}
        orgType={org.type as "agency" | "customer"}
        userEmail={session.user.email}
        isImpersonating={isImpersonating}
      />
      <main className={`ml-56 ${isImpersonating ? "mt-10" : ""}`}>
        {children}
      </main>
    </div>
  )
}
