/**
 * GET /api/auth/permissions — Hämta aktuella rättigheter i valt konto
 *
 * Returns the effective permission list for the current session context.
 * Used client-side by usePermissions() to show/hide UI elements.
 * The server is always the authoritative source — this is for UX only.
 */
import { requireAuth } from "@/lib/rbac/guards"
import { effectivePermissions } from "@/lib/rbac/policy"

export async function GET() {
  try {
    const ctx = await requireAuth()
    const permissions = effectivePermissions(ctx)
    return Response.json({
      permissions,
      role: ctx.role,
      organizationId: ctx.organizationId,
      isImpersonating: !!ctx.impersonating,
      impersonating: ctx.impersonating ?? null,
    })
  } catch {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
}
