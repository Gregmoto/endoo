/**
 * POST /api/settings/account-mappings/bas/reset — reset all VAT-type mappings to BAS defaults
 */

import { requireAuth }            from "@/lib/rbac/guards"
import { canOrThrow }             from "@/lib/rbac/policy"
import { handleApiError }         from "@/lib/api/handle-error"
import { prisma }                 from "@/lib/prisma"
import { BAS_DEFAULTS }           from "@/lib/accounts/account-mapping"

export async function POST() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:account_mappings:update")

    await prisma.$transaction(async (tx) => {
      await tx.accountMapping.deleteMany({
        where: { organizationId: ctx.organizationId },
      })
      await tx.accountMapping.createMany({
        data: Object.entries(BAS_DEFAULTS).map(([vatTypeCode, def]) => ({
          organizationId: ctx.organizationId,
          vatTypeCode,
          salesAccount:   def.salesAccount,
          vatAccountOut:  def.vatAccountOut,
          vatAccountIn:   def.vatAccountIn ?? null,
          description:    def.description,
        })),
      })
    })

    return Response.json({ message: "Återställt" })
  } catch (err) {
    return handleApiError(err, "settings/account-mappings/bas/reset")
  }
}
