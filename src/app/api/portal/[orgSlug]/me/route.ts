/**
 * GET /api/portal/[orgSlug]/me
 * Return the authenticated contact's profile.
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

  const contact = await prisma.contact.findUnique({
    where:  { id: claims.sub },
    select: { id: true, name: true, email: true, phone: true, addressLine1: true, city: true, postalCode: true },
  })

  if (!contact) return portalUnauthorized()

  return apiOk({ contact, orgName: claims.orgName })
}
