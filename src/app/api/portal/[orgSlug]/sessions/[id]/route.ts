/**
 * DELETE /api/portal/[orgSlug]/sessions/[id]
 * Revoke a trusted device by its DB id.
 */

import { prisma }       from "@/lib/prisma"
import { apiOk }        from "@/lib/api/response"
import {
  requirePortalAuth,
  portalUnauthorized,
  PortalAuthError,
} from "@/lib/portal/auth"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> }
) {
  const { orgSlug, id } = await params
  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try {
    claims = await requirePortalAuth(orgSlug)
  } catch (e) {
    if (e instanceof PortalAuthError) return portalUnauthorized()
    throw e
  }

  // Find device scoped to this contact
  const device = await prisma.trustedDevice.findFirst({
    where: { id, organizationId: claims.orgId, contactId: claims.sub, revokedAt: null },
    select: { id: true },
  })
  if (!device) return Response.json({ error: "Enhet hittades inte" }, { status: 404 })

  await prisma.trustedDevice.update({
    where: { id },
    data:  { revokedAt: new Date() },
  })

  return apiOk({ ok: true })
}
