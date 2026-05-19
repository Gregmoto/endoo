import { requireAuth }               from "@/lib/rbac/guards"
import { canOrThrow }                from "@/lib/rbac/policy"
import { INVOICING_SETTINGS_PERMISSIONS } from "@/lib/rbac/permissions"
import { seedInvoicingDefaults }     from "@/lib/invoicing/seed"

export async function POST() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, INVOICING_SETTINGS_PERMISSIONS.UPDATE)
    await seedInvoicingDefaults(ctx.organizationId)
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Fel" }, { status: 500 })
  }
}
