import { NextRequest }        from "next/server"
import { requireAuth }        from "@/lib/rbac/guards"
import { canOrThrow }         from "@/lib/rbac/policy"
import { REPORT_PERMISSIONS } from "@/lib/rbac/permissions"
import { getVatReport }       from "@/services/reports/vat-report"

function serializeBigInt(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (_, v) => typeof v === "bigint" ? v.toString() : v))
}

function handleError(err: unknown): Response {
  if (err instanceof Error) {
    if (err.message.includes("Not authenticated")) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (err.message.includes("does not have permission")) return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  console.error("[report:vat]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, REPORT_PERMISSIONS.READ)

    const { searchParams } = req.nextUrl
    const fromDate = searchParams.get("fromDate")
    const toDate   = searchParams.get("toDate")

    if (!fromDate || !toDate) {
      return Response.json({ error: "fromDate and toDate are required" }, { status: 400 })
    }

    const report = await getVatReport({
      organizationId: ctx.organizationId,
      fromDate,
      toDate,
    })

    return Response.json(serializeBigInt(report))
  } catch (err) {
    return handleError(err)
  }
}
