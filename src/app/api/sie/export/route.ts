import { NextRequest }           from "next/server"
import { requireAuth }           from "@/lib/rbac/guards"
import { canOrThrow }            from "@/lib/rbac/policy"
import { requireFeature }        from "@/lib/plans/guard"
import { handleApiError }        from "@/lib/api/handle-error"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { exportSie4 }            from "@/lib/sie/exporter"

function handleError(err: unknown): Response {
  if (err instanceof Error && err.message === "Fiscal year not found") {
    return Response.json({ error: "Fiscal year not found" }, { status: 404 })
  }
  return handleApiError(err, "sie/export")
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.EXPORT)
    await requireFeature(ctx.organizationId, "sie_export")

    const { searchParams } = req.nextUrl
    const fiscalYearId = searchParams.get("fiscalYearId")

    if (!fiscalYearId) {
      return Response.json({ error: "fiscalYearId is required" }, { status: 400 })
    }

    const sie4 = await exportSie4({
      organizationId: ctx.organizationId,
      fiscalYearId,
    })

    return new Response(sie4, {
      headers: {
        "Content-Type":        "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sie4-export.se"',
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
