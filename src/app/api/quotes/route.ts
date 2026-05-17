/**
 * GET  /api/quotes  — list quotes with filters + pagination
 * POST /api/quotes  — create a new quote (draft)
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { Prisma }      from "@prisma/client"
import { z }           from "zod"

// ─── Line item schema ─────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  description:  z.string().min(1).max(1000),
  quantity:     z.number().positive(),
  unit:         z.string().max(30).default("st"),
  unitPriceKr:  z.number().min(0),
  taxRate:      z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1).default(0),
})

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "quotes:read")

    const url      = new URL(req.url)
    const search   = url.searchParams.get("search")   ?? ""
    const status   = url.searchParams.get("status")   ?? ""
    const contactId = url.searchParams.get("contactId") ?? ""
    const page     = parseInt(url.searchParams.get("page") ?? "1")
    const limit    = 50

    const where: Prisma.QuoteWhereInput = {
      organizationId: ctx.organizationId,
      ...(status    ? { status: status as Prisma.EnumQuoteStatusFilter } : {}),
      ...(contactId ? { contactId } : {}),
      ...(search    ? {
        OR: [
          { number:      { contains: search, mode: "insensitive" as const } },
          { contactName: { contains: search, mode: "insensitive" as const } },
          { title:       { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true, number: true, title: true, status: true,
          contactName: true, contactEmail: true, contactId: true,
          currency: true, lineItems: true, discount: true, discountType: true,
          validUntil: true, sentAt: true, respondedAt: true,
          convertedToInvoiceId: true, convertedToContractId: true,
          createdAt: true,
        },
      }),
      prisma.quote.count({ where }),
    ])

    return Response.json({ quotes, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    return handleError(err)
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  contactId:    z.string().uuid().optional().nullable(),
  contactName:  z.string().min(1).max(255),
  contactEmail: z.string().email().optional().nullable(),
  contactAddress: z.string().max(1000).optional().nullable(),
  title:        z.string().max(255).optional().nullable(),
  currency:     z.string().max(3).default("SEK"),
  discount:     z.number().min(0).optional().nullable(),
  discountType: z.enum(["percent", "amount"]).optional().nullable(),
  notes:        z.string().max(5000).optional().nullable(),
  terms:        z.string().max(5000).optional().nullable(),
  internalNote: z.string().max(5000).optional().nullable(),
  validUntil:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  lineItems:    z.array(LineItemSchema).min(1),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "quotes:create")

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    // Auto-generate quote number: Q-YYYY-NNNN per org
    const year  = new Date().getFullYear()
    const count = await prisma.quote.count({ where: { organizationId: ctx.organizationId } })
    const number = `Q-${year}-${String(count + 1).padStart(4, "0")}`

    const quote = await prisma.quote.create({
      data: {
        organizationId: ctx.organizationId,
        number,
        title:          parsed.data.title     ?? null,
        contactId:      parsed.data.contactId ?? null,
        contactName:    parsed.data.contactName,
        contactEmail:   parsed.data.contactEmail  ?? null,
        contactAddress: parsed.data.contactAddress ? { text: parsed.data.contactAddress } : Prisma.JsonNull,
        currency:       parsed.data.currency,
        lineItems:      parsed.data.lineItems,
        discount:       parsed.data.discount   ?? null,
        discountType:   parsed.data.discountType ?? null,
        notes:          parsed.data.notes      ?? null,
        terms:          parsed.data.terms      ?? null,
        internalNote:   parsed.data.internalNote ?? null,
        validUntil:     parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        createdByUserId: ctx.userId,
      },
    })

    return Response.json(quote, { status: 201 })
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
  console.error("[quotes]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
