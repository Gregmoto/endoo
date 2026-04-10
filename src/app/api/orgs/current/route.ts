import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Ej inloggad" }, { status: 401 })

  const [activeOrg, impersonatingOrg] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.activeOrganizationId },
      select: { id: true, slug: true, name: true, type: true, plan: true, logoUrl: true, primaryColor: true },
    }),
    session.impersonatingOrganizationId
      ? prisma.organization.findUnique({
          where: { id: session.impersonatingOrganizationId },
          select: { id: true, slug: true, name: true, type: true, plan: true, logoUrl: true },
        })
      : null,
  ])

  return Response.json({ activeOrg, impersonatingOrg })
}
