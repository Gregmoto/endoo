/**
 * GET /api/portal/[orgSlug]/quotes/[id]
 * Return quote detail for the authenticated contact.
 */

import { requirePortalAuth, portalUnauthorized } from "@/lib/portal/auth"
import { prisma }   from "@/lib/prisma"
import { apiOk }   from "@/lib/api/response"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> }
) {
  const { orgSlug, id } = await params

  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try { claims = await requirePortalAuth(orgSlug) }
  catch { return portalUnauthorized() }

  const quote = await prisma.quote.findFirst({
    where: {
      id,
      organizationId: claims.orgId,
      contactId:      claims.sub,
      status:         { notIn: ["draft", "cancelled"] },
    },
  })

  if (!quote) return Response.json({ error: "Offert hittades inte" }, { status: 404 })

  return apiOk({ quote })
}
