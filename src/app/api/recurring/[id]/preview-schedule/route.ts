import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk, apiError } from "@/lib/api/response"
import { generatePreviewSchedule } from "@/lib/invoicing/recurring/schedule"
import type { RecurringFrequency } from "@/lib/invoicing/recurring/schedule"
import { calcLineTotal, calcTaxAmount } from "@/lib/contracts/utils"

function calcEstimatedAmount(lines: { quantity: unknown; unitPrice: unknown; discountRate: unknown; taxRate: unknown }[]): number {
  return lines.reduce((sum, l) => {
    const lt  = calcLineTotal(Number(l.quantity), Number(l.unitPrice), Number(l.discountRate))
    const tax = calcTaxAmount(lt, Number(l.taxRate))
    return sum + lt + tax
  }, 0)
}

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:read")

    const { id } = await params

    const schedule = await prisma.recurringSchedule.findFirst({
      where:   { id, organizationId: ctx.organizationId, deletedAt: null },
      include: { lines: true },
    })
    if (!schedule) return apiError("not_found", "Avtalet hittades inte")

    const url   = new URL(req.url)
    const count = Math.min(50, Math.max(1, parseInt(url.searchParams.get("count") ?? "12")))

    const estimatedAmount = calcEstimatedAmount(schedule.lines)

    const entries = generatePreviewSchedule({
      startDate:   schedule.nextIssueDate,
      frequency:   schedule.frequency as RecurringFrequency,
      customDays:  schedule.customDays ?? undefined,
      endDate:     schedule.endDate ?? undefined,
      maxInvoices: schedule.maxInvoices != null
        ? Math.max(0, schedule.maxInvoices - schedule.issuedCount)
        : undefined,
      count,
    })

    const result = entries.map(e => ({
      date:             e.date,
      periodLabel:      e.periodLabel,
      index:            e.index,
      estimatedAmount,
    }))

    return apiOk(result)
  } catch (err) {
    return handleApiError(err, "recurring/preview-schedule")
  }
}
