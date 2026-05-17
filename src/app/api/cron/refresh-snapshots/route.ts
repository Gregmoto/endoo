/**
 * GET /api/cron/refresh-snapshots
 *
 * Vercel Cron route that refreshes ClientSnapshot rows for every active agency.
 * Designed to run on a schedule (e.g. "0 * * * *" — hourly).
 *
 * Security: Authorization: Bearer {CRON_SECRET}
 *
 * Returns JSON: { ok: true, agencies: N }
 */

import { type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { computeAllSnapshots } from "@/services/agency/compute-snapshot"

export async function GET(req: NextRequest): Promise<Response> {
  const secret = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const agencies = await prisma.organization.findMany({
    where: { type: "agency", isActive: true },
    select: { id: true },
  })

  let computed = 0
  for (const agency of agencies) {
    await computeAllSnapshots(agency.id)
    computed++
  }

  console.log(`[cron/refresh-snapshots] agencies=${computed}`)
  return Response.json({ ok: true, agencies: computed })
}
