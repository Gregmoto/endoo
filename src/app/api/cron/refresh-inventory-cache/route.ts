import { prisma }                  from "@/lib/prisma"
import { refreshAllStockCache }    from "@/lib/inventory/stock-cache"
import { refreshAllReservations }  from "@/lib/inventory/reservations"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgs = await prisma.organization.findMany({
    where:  { deletedAt: null },
    select: { id: true },
  })

  let processed = 0
  const errors: string[] = []

  for (const org of orgs) {
    try {
      await refreshAllStockCache(org.id)
      await refreshAllReservations(org.id)
      processed++
    } catch (err) {
      errors.push(`org ${org.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return Response.json({ processed, errors })
}

export const POST = GET
