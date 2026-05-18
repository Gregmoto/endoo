/**
 * POST /api/accounting/sru/generate
 *
 * Generate an SRU export for a fiscal year.
 *
 * Body: { fiscalYearId: string, type: "k2" | "k3" | "ink2" }
 * Returns: { exportId, infoSru, blankettSru, taxYear, companyName }
 */

import { NextRequest }         from "next/server"
import { requireAuth }         from "@/lib/rbac/guards"
import { canOrThrow }          from "@/lib/rbac/policy"
import { SRU_EXPORT_PERMISSIONS } from "@/lib/rbac/permissions"
import { requireFeature }      from "@/lib/plans/guard"
import { prisma }              from "@/lib/prisma"
import { generateK2Sru }       from "@/lib/accounting/sru/k2"
import { generateK3Sru }       from "@/lib/accounting/sru/k3"
import { generateInk2Sru }     from "@/lib/accounting/sru/ink2"
import { generateInfoSru, generateBlankettSru } from "@/lib/accounting/sru/format"
import type { SruExportType }  from "@/lib/accounting/sru/types"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SRU_EXPORT_PERMISSIONS.GENERATE)
    await requireFeature(ctx.organizationId, "sru_export")

    const body = await req.json()
    const { fiscalYearId, type } = body as { fiscalYearId: string; type: SruExportType }

    if (!fiscalYearId) {
      return Response.json({ error: "fiscalYearId krävs" }, { status: 400 })
    }
    if (!["k2", "k3", "ink2"].includes(type)) {
      return Response.json({ error: 'type måste vara "k2", "k3" eller "ink2"' }, { status: 400 })
    }

    const orgId = ctx.organizationId

    // Verify fiscal year belongs to this org
    const fy = await prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, organizationId: orgId },
      select: { id: true, status: true, name: true },
    })
    if (!fy) {
      return Response.json({ error: "Räkenskapsår hittades inte" }, { status: 404 })
    }

    // Generate SRU document
    let sruDoc
    if (type === "k2") {
      sruDoc = await generateK2Sru(orgId, fiscalYearId)
    } else if (type === "k3") {
      sruDoc = await generateK3Sru(orgId, fiscalYearId)
    } else {
      sruDoc = await generateInk2Sru(orgId, fiscalYearId)
    }

    const infoSru     = generateInfoSru(sruDoc)
    const blankettSru = generateBlankettSru(sruDoc)

    // Persist export record
    const exportRecord = await prisma.sruExport.create({
      data: {
        organizationId:    orgId,
        fiscalYearId,
        type,
        status:            "draft",
        infoSru,
        blankettSru,
        generatedByUserId: ctx.userId,
      },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId:         ctx.userId,
        action:         "sru_export_generate",
        entityType:     "sru_export",
        entityId:       exportRecord.id,
        meta:           { type, fiscalYearId, fiscalYearName: fy.name },
      },
    })

    return Response.json({
      exportId:    exportRecord.id,
      infoSru,
      blankettSru,
      taxYear:     sruDoc.taxYear,
      companyName: sruDoc.companyName,
      orgNumber:   sruDoc.orgNumber,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Okänt fel"
    return Response.json({ error: msg }, { status: 500 })
  }
}
