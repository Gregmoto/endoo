import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { INVOICING_SETTINGS_PERMISSIONS } from "@/lib/rbac/permissions"
import { VAT_TYPES } from "@/lib/invoicing/vat-types"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, INVOICING_SETTINGS_PERMISSIONS.READ)
    return Response.json(VAT_TYPES)
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
