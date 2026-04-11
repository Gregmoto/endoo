/**
 * /app — redirect hub after login
 *
 * Finds the user's primary org and redirects to /{orgSlug}.
 * Also handles super admins who have no org (→ /platform).
 */
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function AppIndexPage() {
  const session = await auth()

  if (!session?.user?.id) redirect("/login")

  // Super admin with no org → platform dashboard
  if (session.user.isPlatformAdmin) {
    const hasMembership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, deletedAt: null },
    })
    if (!hasMembership) redirect("/platform/organizations")
  }

  // Find primary membership
  const primary = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, isPrimary: true, deletedAt: null },
    include: { organization: { select: { slug: true } } },
  })

  if (primary) redirect(`/${primary.organization.slug}`)

  // Fallback: any membership
  const any = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, deletedAt: null },
    include: { organization: { select: { slug: true } } },
  })

  if (any) redirect(`/${any.organization.slug}`)

  // No org at all — shouldn't happen after registration
  redirect("/login")
}
