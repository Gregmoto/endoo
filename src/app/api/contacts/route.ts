/**
 * GET  /api/contacts          — list contacts (search, status, type, pagination)
 * POST /api/contacts          — create new contact
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { Prisma } from "@prisma/client"
import { z } from "zod"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:read")

    const url = new URL(req.url)
    const search  = url.searchParams.get("search")  ?? ""
    const status  = url.searchParams.get("status")  ?? ""
    const type    = url.searchParams.get("type")    ?? ""
    const page    = parseInt(url.searchParams.get("page") ?? "1")
    const limit   = 50

    const where: Prisma.ContactWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(status ? { status: status as Prisma.EnumContactStatusFilter } : {}),
      ...(type   ? { type } : {}),
      ...(search ? {
        OR: [
          { name:      { contains: search, mode: "insensitive" } },
          { email:     { contains: search, mode: "insensitive" } },
          { orgNumber: { contains: search, mode: "insensitive" } },
          { customerNumber: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          _count: { select: { invoices: { where: { deletedAt: null, status: { not: "draft" } } } } },
          contactPersons: {
            where: { deletedAt: null, isPrimary: true },
            select: { name: true, email: true, phone: true },
            take: 1,
          },
        },
      }),
      prisma.contact.count({ where }),
    ])

    return Response.json({ contacts, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    return handleError(err)
  }
}

const CreateSchema = z.object({
  name:             z.string().min(1).max(255),
  type:             z.enum(["business", "individual"]).default("business"),
  status:           z.enum(["active", "inactive", "blocked", "ended", "test"]).default("active"),
  customerNumber:   z.string().max(50).optional().nullable(),
  email:            z.string().email().max(255).optional().nullable(),
  phone:            z.string().max(30).optional().nullable(),
  website:          z.string().max(255).optional().nullable(),
  orgNumber:        z.string().max(20).optional().nullable(),
  vatNumber:        z.string().max(30).optional().nullable(),
  addressLine1:     z.string().max(255).optional().nullable(),
  addressLine2:     z.string().max(255).optional().nullable(),
  city:             z.string().max(100).optional().nullable(),
  postalCode:       z.string().max(20).optional().nullable(),
  country:          z.string().length(2).default("SE"),
  deliveryLine1:    z.string().max(255).optional().nullable(),
  deliveryLine2:    z.string().max(255).optional().nullable(),
  deliveryCity:     z.string().max(100).optional().nullable(),
  deliveryPostalCode:z.string().max(20).optional().nullable(),
  deliveryCountry:  z.string().length(2).optional().nullable(),
  defaultCurrency:  z.string().max(3).optional().nullable(),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).optional().nullable(),
  customerReference:z.string().max(100).optional().nullable(),
  internalNotes:    z.string().max(5000).optional().nullable(),
  notes:            z.string().max(5000).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:create")

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    // Auto-generate customerNumber if not provided
    let customerNumber = parsed.data.customerNumber
    if (!customerNumber) {
      const count = await prisma.contact.count({ where: { organizationId: ctx.organizationId } })
      customerNumber = `K-${String(count + 1).padStart(4, "0")}`
    }

    const contact = await prisma.contact.create({
      data: {
        ...parsed.data,
        organizationId: ctx.organizationId,
        customerNumber,
      },
    })

    return Response.json(contact, { status: 201 })
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
  console.error("[contacts]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
