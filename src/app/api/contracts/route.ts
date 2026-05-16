/**
 * GET  /api/contracts  — list recurring schedules (contracts)
 * POST /api/contracts  — create contract with lines
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { Prisma } from "@prisma/client"
import { z } from "zod"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contracts:read")

    const url    = new URL(req.url)
    const search = url.searchParams.get("search") ?? ""
    const status = url.searchParams.get("status") ?? ""
    const page   = parseInt(url.searchParams.get("page") ?? "1")
    const limit  = 50

    const where: Prisma.RecurringScheduleWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { name:           { contains: search, mode: "insensitive" } },
          { contractNumber: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    }

    const [contracts, total] = await Promise.all([
      prisma.recurringSchedule.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          contact: { select: { id: true, name: true, customerNumber: true } },
          _count:  { select: { invoices: true } },
        },
      }),
      prisma.recurringSchedule.count({ where }),
    ])

    return Response.json({ contracts, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    return handleError(err)
  }
}

const LineSchema = z.object({
  description:  z.string().min(1).max(1000),
  quantity:     z.number().positive(),
  unit:         z.string().max(30).default("st"),
  unitPriceKr:  z.number().min(0),
  taxRate:      z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1).default(0),
  productId:    z.string().uuid().optional().nullable(),
  sortOrder:    z.number().int().default(0),
})

const CreateSchema = z.object({
  name:             z.string().min(1).max(255),
  contactId:        z.string().uuid().optional().nullable(),
  frequency:        z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  startDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  currency:         z.string().max(3).default("SEK"),
  paymentTermsDays: z.number().int().min(0).default(30),
  autoSend:         z.boolean().default(false),
  reference:        z.string().max(255).optional().nullable(),
  notes:            z.string().max(5000).optional().nullable(),
  internalNotes:    z.string().max(5000).optional().nullable(),
  lines:            z.array(LineSchema).min(1),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contracts:create")

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    // Auto-generate contract number
    const count = await prisma.recurringSchedule.count({ where: { organizationId: ctx.organizationId } })
    const contractNumber = `AVT-${String(count + 1).padStart(4, "0")}`

    const contract = await prisma.recurringSchedule.create({
      data: {
        organizationId:   ctx.organizationId,
        contractNumber,
        name:             parsed.data.name,
        contactId:        parsed.data.contactId ?? null,
        status:           "draft",
        frequency:        parsed.data.frequency,
        startDate:        new Date(parsed.data.startDate),
        endDate:          parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        nextIssueDate:    new Date(parsed.data.startDate),
        currency:         parsed.data.currency,
        paymentTermsDays: parsed.data.paymentTermsDays,
        autoSend:         parsed.data.autoSend,
        reference:        parsed.data.reference ?? null,
        notes:            parsed.data.notes     ?? null,
        internalNotes:    parsed.data.internalNotes ?? null,
        createdByUserId:  ctx.userId,
        lines: {
          create: parsed.data.lines.map((l, i) => ({
            organizationId: ctx.organizationId,
            description:    l.description,
            quantity:       l.quantity,
            unit:           l.unit,
            unitPrice:      BigInt(Math.round(l.unitPriceKr * 100)),
            taxRate:        l.taxRate,
            discountRate:   l.discountRate,
            productId:      l.productId ?? null,
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
        entityId:       contract.id,
        after:          { name: contract.name, contractNumber: contract.contractNumber, frequency: contract.frequency },
      },
    }).catch(() => {})

    return Response.json(contract, { status: 201 })
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
  console.error("[contracts]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
