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

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.READ)

    const periods = await prisma.vatPeriod.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { periodStart: "desc" },
    })

    return Response.json(serializeBigInt(periods))
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "UnauthenticatedError")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.name === "UnauthorizedError")
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[vat-periods GET]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.MANAGE_PERIODS)

    const body = (await req.json()) as {
      periodType:  "monthly" | "quarterly" | "yearly"
      periodStart: string
      periodEnd:   string
    }

    if (!body.periodType || !body.periodStart || !body.periodEnd) {
      return Response.json({ error: "periodType, periodStart och periodEnd krävs" }, { status: 400 })
    }

    const period = await prisma.vatPeriod.create({
      data: {
        organizationId: ctx.organizationId,
        periodType:     body.periodType,
        periodStart:    new Date(body.periodStart),
        periodEnd:      new Date(body.periodEnd),
        status:         "open",
      },
    })

    return Response.json(serializeBigInt(period), { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "UnauthenticatedError")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.name === "UnauthorizedError")
        return Response.json({ error: "Forbidden" }, { status: 403 })
      if (err.message.includes("Unique constraint"))
        return Response.json({ error: "En period med samma datum finns redan" }, { status: 409 })
    }
    console.error("[vat-periods POST]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
