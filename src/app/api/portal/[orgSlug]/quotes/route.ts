/**
 * GET /api/portal/[orgSlug]/quotes
 * List quotes for the authenticated contact.
 */

import { requirePortalAuth, portalUnauthorized } from "@/lib/portal/auth"
import { prisma }   from "@/lib/prisma"
import { apiOk }   from "@/lib/api/response"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params

  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try { claims = await requirePortalAuth(orgSlug) }
  catch { return portalUnauthorized() }

  const quotes = await prisma.quote.findMany({
    where: {
      organizationId: claims.orgId,
      contactId:      claims.sub,
      status:         { notIn: ["draft", "cancelled"] },
    },
    select: {
      id:        true,
      number:    true,
      title:     true,
      status:    true,
      currency:  true,
      validUntil: true,
      sentAt:    true,
    },
    orderBy: { sentAt: "desc" },
  })

  return apiOk({ quotes })
}
