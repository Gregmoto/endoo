/**
 * GET /api/accounting/fiscal-years/[id]/year-end/closing-statements
 * Returns the immutable snapshots stored at closing time.
 * 404 if year is not yet closed.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission } from "@/lib/rbac/guards"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[year-end/closing-statements]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    requirePermission(ctx, ACCOUNTING_PERMISSIONS.YEAR_END_READ)

    const { id } = await params

    const fy = await prisma.fiscalYear.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: {
        id:                            true,
        name:                          true,
        startDate:                     true,
        endDate:                       true,
        status:                        true,
        closingJournalId:              true,
        openingJournalId:              true,
        closingHash:                   true,
        closedAt:                      true,
        closedBalanceSheetSnapshot:    true,
        closedIncomeStatementSnapshot: true,
        closedBy: { select: { id: true, fullName: true, email: true } },
      },
    })

    if (!fy) return Response.json({ error: "Hittades inte" }, { status: 404 })

    if (fy.status !== "closed") {
      return Response.json(
        { error: "Räkenskapsåret är inte avslutat", status: fy.status },
        { status: 409 }
      )
    }

    return Response.json({
      fiscalYear:      fy,
      balanceSheet:    fy.closedBalanceSheetSnapshot,
      incomeStatement: fy.closedIncomeStatementSnapshot,
    })
  } catch (err) {
    return handleError(err)
  }
}
