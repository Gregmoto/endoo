/**
 * GET /api/auth/orgs
 * Returns all organizations the current user is a member of.
 * Used by the org-switcher in the sidebar.
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      organization: { isActive: true },
    },
    select: {
      role: true,
      organization: {
        select: { id: true, name: true, slug: true, type: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return Response.json(
    memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      type: m.organization.type,
      role: m.role,
    }))
  )
}
