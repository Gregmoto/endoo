import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk, apiError } from "@/lib/api/response"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:read")

    const { id } = await params

    const schedule = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        contact: { select: { id: true, name: true, customerNumber: true, email: true } },
        lines:   { orderBy: { sortOrder: "asc" } },
        invoices: {
          where:   { deletedAt: null },
          orderBy: { issueDate: "desc" },
          take:    5,
          select: {
            id:            true,
            invoiceNumber: true,
            issueDate:     true,
            dueDate:       true,
            totalAmount:   true,
            status:        true,
          },
        },
      },
    })

    if (!schedule) return apiError("not_found", "Avtalet hittades inte")

    return apiOk(schedule)
  } catch (err) {
    return handleApiError(err, "recurring/[id] GET")
  }
}

const LineSchema = z.object({
  id:           z.string().uuid().optional(),
  description:  z.string().min(1).max(1000),
  quantity:     z.number().positive(),
  unit:         z.string().max(30).default("st"),
  unitPriceKr:  z.number().min(0),
  taxRate:      z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1).default(0),
  sortOrder:    z.number().int().default(0),
})

const UpdateSchema = z.object({
  name:             z.string().min(1).max(255).optional(),
  title:            z.string().max(255).optional().nullable(),
  description:      z.string().max(5000).optional().nullable(),
  contactId:        z.string().uuid().optional().nullable(),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  maxInvoices:      z.number().int().min(1).optional().nullable(),
  currency:         z.string().max(3).optional(),
  paymentTermsDays: z.number().int().min(0).optional(),
  ourReference:     z.string().max(255).optional().nullable(),
  yourReference:    z.string().max(255).optional().nullable(),
  autoSendMethod:   z.enum(["email", "print", "manual"]).optional(),
  notes:            z.string().max(5000).optional().nullable(),
  lines:            z.array(LineSchema).min(1).optional(),
})

export async function PUT(req: Request, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:update")

    const { id } = await params

    const existing = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return apiError("not_found", "Avtalet hittades inte")

    if (existing.status !== "draft" && existing.status !== "paused") {
      return apiError("bad_request", "Kan bara redigera utkast eller pausade avtal")
    }

    const body   = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError("bad_request", "Ogiltiga uppgifter", 400, { details: parsed.error.flatten() })
    }

    const d = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      if (d.lines) {
        await tx.recurringScheduleLine.deleteMany({
          where: { scheduleId: id, organizationId: ctx.organizationId },
        })
        await tx.recurringScheduleLine.createMany({
          data: d.lines.map((l, i) => ({
            scheduleId:     id,
            organizationId: ctx.organizationId,
            description:    l.description,
            quantity:       l.quantity,
            unit:           l.unit,
            unitPrice:      BigInt(Math.round(l.unitPriceKr * 100)),
            taxRate:        l.taxRate,
            discountRate:   l.discountRate,
            sortOrder:      l.sortOrder ?? i,
          })),
        })
      }

      return tx.recurringSchedule.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          ...(d.name             !== undefined ? { name: d.name }                       : {}),
          ...(d.title            !== undefined ? { title: d.title }                     : {}),
          ...(d.description      !== undefined ? { description: d.description }         : {}),
          ...(d.contactId        !== undefined ? { contactId: d.contactId }             : {}),
          ...(d.endDate          !== undefined ? { endDate: d.endDate ? new Date(d.endDate) : null } : {}),
          ...(d.maxInvoices      !== undefined ? { maxInvoices: d.maxInvoices }         : {}),
          ...(d.currency         !== undefined ? { currency: d.currency }               : {}),
          ...(d.paymentTermsDays !== undefined ? { paymentTermsDays: d.paymentTermsDays } : {}),
          ...(d.ourReference     !== undefined ? { ourReference: d.ourReference }       : {}),
          ...(d.yourReference    !== undefined ? { yourReference: d.yourReference }     : {}),
          ...(d.autoSendMethod   !== undefined ? { autoSendMethod: d.autoSendMethod }   : {}),
          ...(d.notes            !== undefined ? { notes: d.notes }                     : {}),
        },
        include: {
          contact: { select: { id: true, name: true } },
          lines:   { orderBy: { sortOrder: "asc" } },
        },
      })
    })

    return apiOk(updated)
  } catch (err) {
    return handleApiError(err, "recurring/[id] PUT")
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:delete")

    const { id } = await params

    const existing = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return apiError("not_found", "Avtalet hittades inte")

    if (existing.status !== "draft") {
      return apiError("bad_request", "Kan bara ta bort utkast")
    }

    await prisma.recurringSchedule.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { deletedAt: new Date() },
    })

    return apiOk({ ok: true })
  } catch (err) {
    return handleApiError(err, "recurring/[id] DELETE")
  }
}
