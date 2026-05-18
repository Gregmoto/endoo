/**
 * GET /api/fixed-assets/[id]/depreciation-schedule
 *
 * Returns the full planned + posted depreciation schedule for an asset.
 * If no planned schedules exist yet, calculates on-the-fly.
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { FIXED_ASSET_PERMISSIONS } from "@/lib/rbac/permissions"
import { calculateSchedule } from "@/lib/accounting/fixed-assets/schedule"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, FIXED_ASSET_PERMISSIONS.READ)
    const { id } = await params

    const asset = await prisma.fixedAsset.findFirst({
      where:   { id, organizationId: ctx.organizationId },
      include: { schedules: { orderBy: { period: "asc" } } },
    })
    if (!asset) return Response.json({ error: "Tillgången hittades ej" }, { status: 404 })

    if (asset.schedules.length > 0) {
      return Response.json(asset.schedules.map(s => ({
        period:             s.period,
        depreciationAmount: s.depreciationAmount.toString(),
        accumulatedAmount:  s.accumulatedAmount.toString(),
        bookValue:          s.bookValue.toString(),
        status:             s.status,
        journalId:          s.journalId,
      })))
    }

    // Fallback: calculate on-the-fly (asset was created before schedule seeding was added)
    const calculated = calculateSchedule({
      acquisitionDate:    asset.acquisitionDate,
      acquisitionCost:    asset.acquisitionCost,
      residualValue:      asset.residualValue,
      usefulLifeMonths:   asset.usefulLifeMonths,
      depreciationMethod: asset.depreciationMethod,
      declineRate:        asset.declineRate ? Number(asset.declineRate) : null,
    })

    return Response.json(calculated.map(s => ({
      period:             s.period,
      depreciationAmount: s.depreciationAmount.toString(),
      accumulatedAmount:  s.accumulatedAmount.toString(),
      bookValue:          s.bookValue.toString(),
      status:             "planned",
      journalId:          null,
    })))
  } catch (err) {
    const name = (err as { name?: string }).name
    if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[fixed-assets/schedule]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
