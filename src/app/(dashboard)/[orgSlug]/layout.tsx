/**
 * Dashboard layout — wraps all /app/[orgSlug]/* routes.
 *
 * Responsibilities:
 *   1. Verify the user is authenticated (middleware handles redirect)
 *   2. Verify the user is a member of this org
 *   3. Load org context and pass via React context
 *   4. Render sidebar + org switcher + impersonation banner
 */
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

interface Props {
  children: React.ReactNode
  params: { orgSlug: string }
}

export default async function DashboardLayout({ children, params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  // Verify user is a member of the org in the URL
  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { id: true, name: true, type: true, slug: true },
  })

  if (!org) redirect("/app")

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: org.id, userId: session.user.id },
    },
  })

  // Agency staff can access via impersonation even without direct membership
  const canAccess =
    membership ||
    session.impersonatingOrganizationId === org.id ||
    session.user.isPlatformAdmin

  if (!canAccess) redirect("/app")

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar — full component in Fas 1 */}
      <aside style={{ width: 240, borderRight: "1px solid #e5e7eb", padding: "1rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "1rem" }}>Endoo</div>
        <nav>
          <a href={`/app/${params.orgSlug}`} style={{ display: "block", padding: "0.25rem 0" }}>Dashboard</a>
          <a href={`/app/${params.orgSlug}/invoices`} style={{ display: "block", padding: "0.25rem 0" }}>Fakturor</a>
          <a href={`/app/${params.orgSlug}/contacts`} style={{ display: "block", padding: "0.25rem 0" }}>Kontakter</a>
          <a href={`/app/${params.orgSlug}/team`} style={{ display: "block", padding: "0.25rem 0" }}>Team</a>
          <a href={`/app/${params.orgSlug}/settings`} style={{ display: "block", padding: "0.25rem 0" }}>Inställningar</a>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "1.5rem" }}>
        {children}
      </main>
    </div>
  )
}
