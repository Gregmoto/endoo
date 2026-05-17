import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"

function serializeBigInt(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.READ)

    const { id } = await params

    const period = await prisma.vatPeriod.findUnique({ where: { id } })

    if (!period || period.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Hittades inte" }, { status: 404 })
    }

    return Response.json(serializeBigInt(period))
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "UnauthenticatedError")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.name === "UnauthorizedError")
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[vat-periods/[id] GET]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
