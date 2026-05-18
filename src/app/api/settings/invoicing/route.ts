/**
 * GET/PATCH /api/settings/invoicing
 * Hämta/uppdatera Organization.invoicingSettings (JSON blob)
 */
import { NextRequest }               from "next/server"
import { requireAuth }               from "@/lib/rbac/guards"
import { canOrThrow }                from "@/lib/rbac/policy"
import { INVOICING_SETTINGS_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }                    from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, INVOICING_SETTINGS_PERMISSIONS.READ)

    const org = await prisma.organization.findFirst({
      where:  { id: ctx.organizationId },
      select: {
        invoicePrefix:            true,
        invoiceSequenceStart:     true,
        defaultCurrency:          true,
        defaultTaxRate:           true,
        defaultPaymentTermsDays:  true,
        invoicingSettings:        true,
      },
    })

    return Response.json(org ?? {})
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Fel" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, INVOICING_SETTINGS_PERMISSIONS.UPDATE)

    const body = await req.json()

    // Merge JSON settings with existing
    const existing = await prisma.organization.findFirst({
      where: { id: ctx.organizationId },
      select: { invoicingSettings: true },
    })
    const current = (existing?.invoicingSettings as Record<string, unknown>) ?? {}
    const merged  = { ...current, ...body }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data:  { invoicingSettings: merged },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "invoicingSettings",
        meta:           { keys: Object.keys(body) },
      },
    })

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Fel" }, { status: 500 })
  }
}
