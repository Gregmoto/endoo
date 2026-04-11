import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { orgSlug: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { id: true, name: true, type: true, slug: true, isActive: true },
  })

  if (!org || !org.isActive) redirect("/app")

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: org.id, userId: session.user.id },
    },
  })

  const canAccess =
    membership?.deletedAt === null ||
    session.impersonatingOrganizationId === org.id ||
    session.user.isPlatformAdmin

  if (!canAccess) redirect("/app")

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        orgSlug={org.slug}
        orgName={org.name}
        orgType={org.type as "agency" | "customer"}
        userEmail={session.user.email}
      />
      <main className="ml-56">
        {children}
      </main>
    </div>
  )
}
