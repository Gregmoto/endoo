import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk, apiError } from "@/lib/api/response"
import { Prisma } from "@prisma/client"
import { z } from "zod"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:read")

    const url  = new URL(req.url)
    const tab  = url.searchParams.get("tab") ?? "active"
    const q    = url.searchParams.get("q") ?? ""
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const size = Math.min(100, parseInt(url.searchParams.get("size") ?? "25"))

    const baseWhere: Prisma.RecurringScheduleWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name:           { contains: q, mode: "insensitive" } },
              { contractNumber: { contains: q, mode: "insensitive" } },
              { title:          { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const tabWhere: Prisma.RecurringScheduleWhereInput = {
      ...baseWhere,
      status: tab as any,
    }

    const [data, total, counts] = await Promise.all([
      prisma.recurringSchedule.findMany({
        where:   tabWhere,
        orderBy: { createdAt: "desc" },
        take:    size,
        skip:    (page - 1) * size,
        include: {
          contact: { select: { id: true, name: true, customerNumber: true } },
          lines:   { select: { unitPrice: true, quantity: true, discountRate: true, taxRate: true } },
        },
      }),
      prisma.recurringSchedule.count({ where: tabWhere }),
      prisma.recurringSchedule.groupBy({
        by:    ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),
    ])

    const countsMap = { active: 0, paused: 0, ended: 0, draft: 0 } as Record<string, number>
    for (const row of counts) countsMap[row.status] = row._count._all

    const serialized = data.map(s => {
      const lineTotal = s.lines.reduce((sum, l) => {
        const lt = Math.round(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discountRate)))
        return sum + lt + Math.round(lt * Number(l.taxRate))
      }, 0)
      return {
        id:             s.id,
        contractNumber: s.contractNumber,
        name:           s.name,
        title:          s.title,
        status:         s.status,
        frequency:      s.frequency,
        startDate:      s.startDate,
        endDate:        s.endDate,
        nextIssueDate:  s.nextIssueDate,
        lastIssuedAt:   s.lastIssuedAt,
        currency:       s.currency,
        autoSendMethod: s.autoSendMethod,
        issuedCount:    s.issuedCount,
        maxInvoices:    s.maxInvoices,
        contact:        s.contact,
        lineTotal,
        createdAt:      s.createdAt,
      }
    })

    return apiOk({
      data: serialized,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
      counts: countsMap,
    })
  } catch (err) {
    return handleApiError(err, "recurring GET")
  }
}

const LineSchema = z.object({
  description:  z.string().min(1).max(1000),
  quantity:     z.number().positive(),
  unit:         z.string().max(30).default("st"),
  unitPriceKr:  z.number().min(0),
  taxRate:      z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1).default(0),
  sortOrder:    z.number().int().default(0),
})

const CreateSchema = z.object({
  name:                z.string().min(1).max(255),
  title:               z.string().max(255).optional().nullable(),
  description:         z.string().max(5000).optional().nullable(),
  contactId:           z.string().uuid().optional().nullable(),
  frequency:           z.enum(["weekly", "biweekly", "monthly", "quarterly", "halfyearly", "yearly", "custom"]),
  customDays:          z.number().int().min(1).optional().nullable(),
  startDate:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  maxInvoices:         z.number().int().min(1).optional().nullable(),
  invoicesPerOccasion: z.number().int().min(1).default(1),
  currency:            z.string().max(3).default("SEK"),
  paymentTermsDays:    z.number().int().min(0).default(30),
  ourReference:        z.string().max(255).optional().nullable(),
  yourReference:       z.string().max(255).optional().nullable(),
  autoSendMethod:      z.enum(["email", "print", "manual"]).default("manual"),
  notes:               z.string().max(5000).optional().nullable(),
  lines:               z.array(LineSchema).min(1),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:create")

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return apiError("bad_request", "Ogiltiga uppgifter", 400, { details: parsed.error.flatten() })
    }

    const d = parsed.data

    const count          = await prisma.recurringSchedule.count({ where: { organizationId: ctx.organizationId } })
    const contractNumber = `AVT-${String(count + 1).padStart(4, "0")}`

    const schedule = await prisma.recurringSchedule.create({
      data: {
        organizationId:      ctx.organizationId,
        contractNumber,
        name:                d.name,
        title:               d.title ?? null,
        description:         d.description ?? null,
        contactId:           d.contactId ?? null,
        status:              "draft",
        frequency:           d.frequency,
        customDays:          d.customDays ?? null,
        startDate:           new Date(d.startDate),
        endDate:             d.endDate ? new Date(d.endDate) : null,
        nextIssueDate:       new Date(d.startDate),
        maxInvoices:         d.maxInvoices ?? null,
        invoicesPerOccasion: d.invoicesPerOccasion,
        currency:            d.currency,
        paymentTermsDays:    d.paymentTermsDays,
        ourReference:        d.ourReference ?? null,
        yourReference:       d.yourReference ?? null,
        autoSendMethod:      d.autoSendMethod,
        notes:               d.notes ?? null,
        createdByUserId:     ctx.userId,
        lines: {
          create: d.lines.map((l, i) => ({
            organizationId: ctx.organizationId,
            description:    l.description,
            quantity:       l.quantity,
            unit:           l.unit,
            unitPrice:      BigInt(Math.round(l.unitPriceKr * 100)),
            taxRate:        l.taxRate,
            discountRate:   l.discountRate,
            sortOrder:      l.sortOrder ?? i,
          })),
        },
      },
      include: {
        contact: { select: { id: true, name: true } },
        lines:   { orderBy: { sortOrder: "asc" } },
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "RecurringSchedule",
        entityId:       schedule.id,
        after:          { name: schedule.name, contractNumber: schedule.contractNumber },
      },
    }).catch(() => {})

    return apiOk(schedule, { status: 201 } as ResponseInit)
  } catch (err) {
    return handleApiError(err, "recurring POST")
  }
}
