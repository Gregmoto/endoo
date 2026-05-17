import { NextRequest }           from "next/server"
import { requireAuth }           from "@/lib/rbac/guards"
import { canOrThrow }            from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { exportSie4 }            from "@/lib/sie/exporter"

function handleError(err: unknown): Response {
  if (err instanceof Error) {
    if (err.message.includes("Not authenticated")) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (err.message.includes("does not have permission")) return Response.json({ error: "Forbidden" }, { status: 403 })
    if (err.message === "Fiscal year not found") return Response.json({ error: "Fiscal year not found" }, { status: 404 })
  }
  console.error("[sie:export]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.EXPORT)

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
