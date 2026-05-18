/**
 * GET  /api/fixed-assets   — list all assets for the org
 * POST /api/fixed-assets   — create a new asset
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { FIXED_ASSET_PERMISSIONS } from "@/lib/rbac/permissions"
import { calculateSchedule } from "@/lib/accounting/fixed-assets/schedule"
import { z } from "zod"

const CreateAssetSchema = z.object({
  assetNumber:                   z.string().min(1).max(50),
  name:                          z.string().min(1).max(200),
  description:                   z.string().max(1000).optional().nullable(),
  category:                      z.string().min(1).max(100),
  assetAccount:                   z.string().min(1).max(10),
  depreciationAccount:            z.string().min(1).max(10),
  accumulatedDepreciationAccount: z.string().min(1).max(10),
  acquisitionDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acquisitionCost:    z.number().int().positive(),  // öre
  residualValue:      z.number().int().min(0).default(0),
  usefulLifeMonths:   z.number().int().positive(),
  depreciationMethod: z.enum(["linear", "declining_balance", "tax_book"]),
  declineRate:        z.number().min(0.01).max(1).optional().nullable(),
  supplierInvoiceId:  z.string().uuid().optional().nullable(),
  notes:              z.string().max(2000).optional().nullable(),
})

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, FIXED_ASSET_PERMISSIONS.READ)

    const assets = await prisma.fixedAsset.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ status: "asc" }, { assetNumber: "asc" }],
      include: {
        schedules: {
          where:   { status: "posted" },
          orderBy: { period: "desc" },
          take:    1,
        },
      },
    })

    const result = assets.map(a => {
      const lastSchedule = a.schedules[0]
      const bookValue = lastSchedule ? lastSchedule.bookValue : a.acquisitionCost
      return {
        id:                             a.id,
        assetNumber:                    a.assetNumber,
        name:                           a.name,
        category:                       a.category,
        acquisitionDate:                a.acquisitionDate,
        acquisitionCost:                a.acquisitionCost.toString(),
        residualValue:                  a.residualValue.toString(),
        bookValue:                      bookValue.toString(),
        depreciationMethod:             a.depreciationMethod,
        usefulLifeMonths:               a.usefulLifeMonths,
        status:                         a.status,
        assetAccount:                   a.assetAccount,
        depreciationAccount:            a.depreciationAccount,
        accumulatedDepreciationAccount: a.accumulatedDepreciationAccount,
      }
    })

    return Response.json(result)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, FIXED_ASSET_PERMISSIONS.CREATE)

    const body = await req.json()
    const parsed = CreateAssetSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(JSON.stringify(parsed.error.flatten()), 422)
    }
    const d = parsed.data

    // Validate asset number uniqueness
    const existing = await prisma.fixedAsset.findFirst({
      where: { organizationId: ctx.organizationId, assetNumber: d.assetNumber },
    })
    if (existing) return errorResponse("Tillgångsnumret används redan", 409)

    const asset = await prisma.fixedAsset.create({
      data: {
        organizationId:                ctx.organizationId,
        assetNumber:                   d.assetNumber,
        name:                          d.name,
        description:                   d.description ?? null,
        category:                      d.category,
        assetAccount:                   d.assetAccount,
        depreciationAccount:            d.depreciationAccount,
        accumulatedDepreciationAccount: d.accumulatedDepreciationAccount,
        acquisitionDate:    new Date(d.acquisitionDate),
        acquisitionCost:    BigInt(d.acquisitionCost),
        residualValue:      BigInt(d.residualValue),
        usefulLifeMonths:   d.usefulLifeMonths,
        depreciationMethod: d.depreciationMethod,
        declineRate:        d.declineRate ?? null,
        supplierInvoiceId:  d.supplierInvoiceId ?? null,
        notes:              d.notes ?? null,
      },
    })

    // Pre-calculate and store planned schedule
    const schedule = calculateSchedule({
      acquisitionDate:    asset.acquisitionDate,
      acquisitionCost:    asset.acquisitionCost,
      residualValue:      asset.residualValue,
      usefulLifeMonths:   asset.usefulLifeMonths,
      depreciationMethod: asset.depreciationMethod,
      declineRate:        d.declineRate ?? null,
    })

    if (schedule.length > 0) {
      await prisma.depreciationSchedule.createMany({
        data: schedule.map(s => ({
          organizationId:    ctx.organizationId,
          fixedAssetId:      asset.id,
          period:            s.period,
          depreciationAmount: s.depreciationAmount,
          accumulatedAmount:  s.accumulatedAmount,
          bookValue:          s.bookValue,
          status:            "planned" as const,
        })),
        skipDuplicates: true,
      })
    }

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "asset_create",
        entityType:     "fixed_asset",
        entityId:       asset.id,
        meta:           { assetNumber: asset.assetNumber, name: asset.name },
      },
    })

    return Response.json({ id: asset.id }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return errorResponse("Ej inloggad", 401)
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return errorResponse("Otillräckliga rättigheter", 403)
  }
  console.error("[fixed-assets]", err)
  return errorResponse("Internt fel", 500)
}
