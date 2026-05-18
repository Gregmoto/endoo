/**
 * GET /api/portal/[orgSlug]/invoices/[id]
 * Return invoice detail for the authenticated contact.
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

  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      organizationId: claims.orgId,
      contactId:      claims.sub,
    },
    include: {
      lineItems: {
        orderBy: { sortOrder: "asc" },
      },
      payments: {
        select: { id: true, amount: true, paymentDate: true, method: true, notes: true },
      },
    },
  })

  if (!invoice) return Response.json({ error: "Faktura hittades inte" }, { status: 404 })

  return apiOk({ invoice })
}
