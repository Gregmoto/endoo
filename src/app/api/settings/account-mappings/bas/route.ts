/**
 * GET  /api/settings/account-mappings/bas   — list all VAT-type account mappings
 *                                             (merged: DB overrides + BAS defaults)
 * POST /api/settings/account-mappings/bas/reset — reset all to BAS defaults
 */

import { requireAuth }            from "@/lib/rbac/guards"
import { canOrThrow }             from "@/lib/rbac/policy"
import { handleApiError }         from "@/lib/api/handle-error"
import { prisma }                 from "@/lib/prisma"
import { BAS_DEFAULTS, getOrCreateDefaultMappings } from "@/lib/accounts/account-mapping"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:account_mappings:read")

    const dbMappings = await prisma.accountMapping.findMany({
      where: { organizationId: ctx.organizationId },
    })

    const dbByVatType = Object.fromEntries(dbMappings.map(m => [m.vatTypeCode, m]))

    const merged = Object.entries(BAS_DEFAULTS).map(([vatTypeCode, def]) => {
      const db = dbByVatType[vatTypeCode]
      return db ?? {
        id:             null,
        organizationId: ctx.organizationId,
        vatTypeCode,
        salesAccount:   def.salesAccount,
        vatAccountOut:  def.vatAccountOut,
        vatAccountIn:   def.vatAccountIn ?? null,
        description:    def.description,
      }
    })

    const extra = dbMappings.filter(m => !(m.vatTypeCode in BAS_DEFAULTS))

    return Response.json({ mappings: [...merged, ...extra] })
  } catch (err) {
    return handleApiError(err, "settings/account-mappings/bas")
  }
}
