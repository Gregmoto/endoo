/**
 * GET /api/depreciation/preview?period=YYYY-MM
 *
 * Dry-run: shows what would be posted for the given period without writing.
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { DEPRECIATION_PERMISSIONS } from "@/lib/rbac/permissions"
import { previewPeriod } from "@/lib/accounting/fixed-assets/depreciation"

export async function GET(req: NextRequest) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, DEPRECIATION_PERMISSIONS.READ)

    const period = req.nextUrl.searchParams.get("period")
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return Response.json({ error: "Ange period som YYYY-MM" }, { status: 422 })
    }

    const lines = await previewPeriod(ctx.organizationId, period)

    return Response.json(lines.map(l => ({
      ...l,
      depreciationAmount: l.depreciationAmount.toString(),
      accumulatedAmount:  l.accumulatedAmount.toString(),
      bookValue:          l.bookValue.toString(),
    })))
  } catch (err) {
    const name = (err as { name?: string }).name
    if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[depreciation/preview]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
