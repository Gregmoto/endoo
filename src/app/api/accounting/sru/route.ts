/**
 * GET /api/accounting/sru
 *
 * List all SRU exports for the current organization.
 */

import { requireAuth }         from "@/lib/rbac/guards"
import { canOrThrow }          from "@/lib/rbac/policy"
import { SRU_EXPORT_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }              from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SRU_EXPORT_PERMISSIONS.READ)

    const exports = await prisma.sruExport.findMany({
      where:   { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        fiscalYear:  { select: { name: true, endDate: true } },
        generatedBy: { select: { fullName: true, email: true } },
      },
    })

    return Response.json(exports)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Okänt fel"
    return Response.json({ error: msg }, { status: 500 })
  }
}
