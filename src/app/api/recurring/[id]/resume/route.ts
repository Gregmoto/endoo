import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk, apiError } from "@/lib/api/response"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:pause")

    const { id } = await params

    const schedule = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!schedule) return apiError("not_found", "Avtalet hittades inte")

    if (schedule.status !== "paused") {
      return apiError("bad_request", "Bara pausade avtal kan återupptas")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nextIssueDate = new Date(schedule.nextIssueDate)
    nextIssueDate.setHours(0, 0, 0, 0)

    // If nextIssueDate is in the past, advance it to today
    const correctedNext = nextIssueDate < today ? today : nextIssueDate

    const updated = await prisma.recurringSchedule.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { status: "active", nextIssueDate: correctedNext },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "RecurringSchedule",
        entityId:       id,
        after:          { status: "active" },
      },
    }).catch(() => {})

    return apiOk(updated)
  } catch (err) {
    return handleApiError(err, "recurring/resume")
  }
}
