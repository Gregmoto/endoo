/**
 * GET    /api/fixed-assets/[id]   — get asset detail + schedule
 * PATCH  /api/fixed-assets/[id]   — update mutable fields
 * DELETE /api/fixed-assets/[id]   — delete active asset (no posted depreciation)
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { FIXED_ASSET_PERMISSIONS } from "@/lib/rbac/permissions"
import { z } from "zod"

const UpdateAssetSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category:    z.string().min(1).max(100).optional(),
  notes:       z.string().max(2000).nullable().optional(),
})

function err(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function handleError(e: unknown) {
  if ((e as { name?: string }).name === "UnauthenticatedError") return err("Ej inloggad", 401)
  if ((e as { name?: string }).name === "UnauthorizedError") return err("Otillräckliga rättigheter", 403)
  console.error("[fixed-assets/id]", e)
  return err("Internt fel", 500)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, FIXED_ASSET_PERMISSIONS.READ)
    const { id } = await params

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        schedules: { orderBy: { period: "asc" } },
      },
    })
    if (!asset) return err("Tillgången hittades ej", 404)

    return Response.json({
      ...asset,
      acquisitionCost:  asset.acquisitionCost.toString(),
      residualValue:    asset.residualValue.toString(),
      disposalProceeds: asset.disposalProceeds?.toString() ?? null,
      declineRate:      asset.declineRate?.toString() ?? null,
      schedules: asset.schedules.map(s => ({
        ...s,
        depreciationAmount: s.depreciationAmount.toString(),
        accumulatedAmount:  s.accumulatedAmount.toString(),
        bookValue:          s.bookValue.toString(),
      })),
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, FIXED_ASSET_PERMISSIONS.UPDATE)
    const { id } = await params

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!asset) return err("Tillgången hittades ej", 404)
    if (asset.status !== "active") return err("Avslutade tillgångar kan inte redigeras", 422)

    const body   = await req.json()
    const parsed = UpdateAssetSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

    const updated = await prisma.fixedAsset.update({
      where: { id },
      data:  parsed.data,
    })

    return Response.json({ id: updated.id })
  } catch (e) {
    return handleError(e)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, FIXED_ASSET_PERMISSIONS.DELETE)
    const { id } = await params

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!asset) return err("Tillgången hittades ej", 404)
    if (asset.status !== "active") return err("Kan inte radera en avslutad tillgång", 422)

    // Block deletion if any depreciation has been posted
    const postedCount = await prisma.depreciationSchedule.count({
      where: { fixedAssetId: id, status: "posted" },
    })
    if (postedCount > 0) {
      return err("Kan inte radera tillgång med bokförda avskrivningar — utrangera istället", 422)
    }

    await prisma.depreciationSchedule.deleteMany({ where: { fixedAssetId: id } })
    await prisma.fixedAsset.delete({ where: { id } })

    return new Response(null, { status: 204 })
  } catch (e) {
    return handleError(e)
  }
}
