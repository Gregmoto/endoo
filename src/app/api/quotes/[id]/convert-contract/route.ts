/**
 * POST /api/quotes/[id]/convert-contract
 * Convert an accepted quote into a RecurringSchedule (contract).
 * Body: { frequency: "monthly" | "quarterly" | ..., startDate: "YYYY-MM-DD", paymentTermsDays?: number }
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { z }           from "zod"

const BodySchema = z.object({
  frequency:       z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  startDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  autoSend:        z.boolean().default(false),
})

type LineItem = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "quotes:convert")
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!quote) return Response.json({ error: "Hittades inte" }, { status: 404 })
    if (!["accepted", "sent", "viewed"].includes(quote.status)) {
      return Response.json({ error: "Kan bara konvertera godkänd, skickad eller visad offert" }, { status: 422 })
    }
    if (quote.convertedToContractId) {
      return Response.json({ error: "Offerten har redan konverterats till ett avtal", contractId: quote.convertedToContractId }, { status: 409 })
    }

    const body   = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const rawLines = (Array.isArray(quote.lineItems) ? quote.lineItems : []) as LineItem[]

    // Auto-generate contract number
    const count = await prisma.recurringSchedule.count({ where: { organizationId: ctx.organizationId } })
    const contractNumber = `AVT-${String(count + 1).padStart(4, "0")}`

    const startDate = new Date(parsed.data.startDate)

    const schedule = await prisma.$transaction(async (tx) => {
      const sch = await tx.recurringSchedule.create({
        data: {
          organizationId:   ctx.organizationId,
          contractNumber,
          name:             quote.title ?? quote.number,
          contactId:        quote.contactId ?? null,
          frequency:        parsed.data.frequency,
          startDate,
          nextIssueDate:    startDate,
          currency:         quote.currency,
          paymentTermsDays: parsed.data.paymentTermsDays,
          autoSend:         parsed.data.autoSend,
          notes:            quote.notes ?? null,
          createdByUserId:  ctx.userId,
          lines: {
            create: rawLines.map((l, i) => ({
              organizationId: ctx.organizationId,
              description:    l.description,
              quantity:       l.quantity,
              unit:           l.unit ?? "st",
              unitPrice:      BigInt(Math.round(l.unitPriceKr * 100)),
              taxRate:        l.taxRate,
              discountRate:   l.discountRate ?? 0,
              sortOrder:      i,
            })),
          },
        },
      })

      await tx.quote.update({
        where: { id },
        data: {
          convertedToContractId: sch.id,
          convertedAt:           new Date(),
          status:                "contracted",
        },
      })

      return sch
    })

    return Response.json({ contractId: schedule.id, contractNumber: schedule.contractNumber }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[quotes/convert-contract]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
