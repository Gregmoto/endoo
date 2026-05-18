/**
 * POST /api/accounting/accounts/seed-bas
 *
 * Seeds or re-seeds BAS 2026 chart of accounts for the org.
 * Idempotent: existing accounts are skipped (skipDuplicates: true).
 *
 * Body: { confirm: true }
 *
 * Permission: accounting:manage_accounts
 */

import { requireAuth }    from "@/lib/rbac/guards"
import { canOrThrow }     from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { seedBasAccounts } from "@/lib/accounting/accounts"
import { handleApiError }  from "@/lib/api/handle-error"
import { prisma }          from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.MANAGE_ACCOUNTS)

    const body = await req.json().catch(() => ({}))
    if (body.confirm !== true) {
      return Response.json(
        { error: "Skicka { confirm: true } för att bekräfta" },
        { status: 400 }
      )
    }

    const seeded = await seedBasAccounts(ctx.organizationId)

    // Count total accounts after seed
    const total = await prisma.account.count({
      where: { organizationId: ctx.organizationId, isActive: true },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Account",
        entityId:       ctx.organizationId,
        meta:           { seededCount: seeded, totalAfter: total },
      },
    }).catch(() => {})

    return Response.json({ seeded, total, message: `${seeded} nya konton importerades` })
  } catch (err) {
    return handleApiError(err, "accounting/accounts/seed-bas")
  }
}
