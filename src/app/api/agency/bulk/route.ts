/**
 * POST /api/agency/bulk — create and immediately start a bulk job
 * GET  /api/agency/bulk — list recent bulk jobs
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { computeClientSnapshot } from "@/services/agency/compute-snapshot"

const ALLOWED_TYPES = ["refresh_snapshots", "send_reminder", "vat_calculate"] as const
type BulkType = typeof ALLOWED_TYPES[number]

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const { type, clientIds } = await req.json() as { type: string; clientIds: string[] }

    if (!ALLOWED_TYPES.includes(type as BulkType)) {
      return Response.json({ error: "Ogiltig åtgärdstyp" }, { status: 400 })
    }
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return Response.json({ error: "Inga klienter valda" }, { status: 400 })
    }

    const job = await prisma.bulkJob.create({
      data: {
        agencyId:        ctx.organizationId,
        createdByUserId: ctx.userId,
        type,
        clientIds,
        status:          "running",
        total:           clientIds.length,
        startedAt:       new Date(),
      },
    })

    // Process synchronously for now (fast operations)
    // For long-running jobs this would be offloaded to a queue
    const succeeded: string[] = []
    const failed: { id: string; error: string }[] = []
    let processed = 0

    for (const clientId of clientIds) {
      try {
        if (type === "refresh_snapshots") {
          await computeClientSnapshot(ctx.organizationId, clientId)
        } else if (type === "send_reminder") {
          await sendClientReminder(clientId)
        }
        succeeded.push(clientId)
      } catch (e) {
        failed.push({ id: clientId, error: e instanceof Error ? e.message : "Okänt fel" })
      }
      processed++
      // Update progress every 5 clients
      if (processed % 5 === 0) {
        await prisma.bulkJob.update({
          where: { id: job.id },
          data: { processed, progress: Math.round((processed / clientIds.length) * 100) },
        })
      }
    }

    await prisma.bulkJob.update({
      where: { id: job.id },
      data: {
        status:      failed.length === clientIds.length ? "failed" : "done",
        progress:    100,
        processed:   clientIds.length,
        result:      { succeeded, failed } as never,
        completedAt: new Date(),
      },
    })

    return Response.json({
      jobId:     job.id,
      succeeded: succeeded.length,
      failed:    failed.length,
      errors:    failed,
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },    { status: 403 })
    }
    console.error("[agency/bulk POST]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const jobs = await prisma.bulkJob.findMany({
      where:   { agencyId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take:    20,
      select: {
        id: true, type: true, status: true, progress: true,
        total: true, processed: true, createdAt: true, completedAt: true,
      },
    })

    return Response.json(jobs)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[agency/bulk GET]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Stub — real implementation would use email.ts
async function sendClientReminder(clientId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: clientId },
    select: { contactEmail: true, name: true },
  })
  if (!org?.contactEmail) throw new Error("Ingen kontaktepost konfigurerad")
  // TODO: integrate with email.ts when reminder template is built
}
