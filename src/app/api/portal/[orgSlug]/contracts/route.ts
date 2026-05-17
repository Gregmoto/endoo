/**
 * GET /api/portal/[orgSlug]/contracts
 * List recurring contracts for the authenticated contact.
 */

import { requirePortalAuth, portalUnauthorized } from "@/lib/portal/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params

  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try { claims = await requirePortalAuth(orgSlug) }
  catch { return portalUnauthorized() }

  const contracts = await prisma.recurringSchedule.findMany({
    where: {
      organizationId: claims.orgId,
      contactId:      claims.sub,
      deletedAt:      null,
      status:         { notIn: ["draft"] },
    },
    select: {
      id:             true,
      contractNumber: true,
      name:           true,
      status:         true,
      frequency:      true,
      startDate:      true,
      endDate:        true,
      nextIssueDate:  true,
      currency:       true,
    },
    orderBy: { startDate: "desc" },
  })

  return Response.json({ contracts })
}
