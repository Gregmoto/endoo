/**
 * GET /api/accounting/fiscal-years
 * Lists all fiscal years for the authenticated organization.
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/rbac/guards"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[accounting/fiscal-years]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function GET() {
  try {
    const ctx = await requireAuth()
    requirePermission(ctx, ACCOUNTING_PERMISSIONS.READ)

    const years = await prisma.fiscalYear.findMany({
      where:   { organizationId: ctx.organizationId },
      orderBy: { startDate: "desc" },
      select: {
        id:        true,
        name:      true,
        startDate: true,
        endDate:   true,
        status:    true,
        isDefault: true,
        closedAt:  true,
        closedBy:  { select: { id: true, fullName: true, email: true } },
      },
    })

    return Response.json(years)
  } catch (err) {
    return handleError(err)
  }
}
