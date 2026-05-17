/**
 * GET /api/accounting/periods
 * Lists all accounting periods for the authenticated org.
 * Includes snapshot totals for locked/closed periods.
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "accounting:read")

    const url    = new URL(req.url)
    const fyId   = url.searchParams.get("fiscalYearId") ?? undefined
    const status = url.searchParams.get("status") ?? undefined

    const periods = await prisma.accountingPeriod.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(fyId   ? { fiscalYearId: fyId } : {}),
        ...(status ? { status: status as "open" | "locked" | "closed" } : {}),
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        snapshot:  true,
        lockedBy:  { select: { id: true, fullName: true, email: true } },
        closedBy:  { select: { id: true, fullName: true, email: true } },
        _count:    { select: { journals: true } },
      },
    })

    return Response.json(periods)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[accounting/periods]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
