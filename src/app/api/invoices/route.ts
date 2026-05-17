/**
 * GET  /api/invoices  — list invoices (search, status, dateFrom, dateTo, pagination)
 * POST /api/invoices  — create invoice with line items
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { indexInvoice } from "@/lib/search/index-entity"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:read")

    const url      = new URL(req.url)
    const search   = url.searchParams.get("search")   ?? ""
    const status   = url.searchParams.get("status")   ?? ""
    const dateFrom = url.searchParams.get("dateFrom") ?? ""
    const dateTo   = url.searchParams.get("dateTo")   ?? ""
    const page     = parseInt(url.searchParams.get("page") ?? "1")
    const limit    = 50

    const where: Prisma.InvoiceWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(status ? { status: status as Prisma.EnumInvoiceStatusFilter } : {}),
      ...(dateFrom ? { issueDate: { gte: new Date(dateFrom) } } : {}),
      ...(dateTo   ? { issueDate: { lte: new Date(dateTo) } } : {}),
      ...(search   ? {
        OR: [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { contact: { name: { contains: search, mode: "insensitive" } } },
          { reference:  { contains: search, mode: "insensitive" } },
          { poNumber:   { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { issueDate: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          contact: { select: { id: true, name: true, customerNumber: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ])

    return Response.json({ invoices, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    return handleError(err)
  }
}

// ─── Line item schema ─────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  description:  z.string().min(1).max(1000),
  quantity:     z.number().positive(),
  unit:         z.string().max(30).default("st"),
  unitPriceKr:  z.number().min(0),   // kr — converted to öre
  taxRate:      z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1).default(0),
  productId:    z.string().uuid().optional().nullable(),
  sortOrder:    z.number().int().default(0),
})

const CreateSchema = z.object({
  contactId:       z.string().uuid().optional().nullable(),
  issueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency:        z.string().max(3).default("SEK"),
  reference:       z.string().max(255).optional().nullable(),
  poNumber:        z.string().max(100).optional().nullable(),
  notes:           z.string().max(5000).optional().nullable(),
  footerText:      z.string().max(5000).optional().nullable(),
  internalNotes:   z.string().max(5000).optional().nullable(),
  type:            z.enum(["invoice", "proforma"]).default("invoice"),
  lineItems:       z.array(LineItemSchema).min(1),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:create")

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    // Auto-generate invoice number
    // Proformas get a PF- prefix; regular invoices use YYYY-NNNN
    const year      = new Date().getFullYear()
    const typeFilter = parsed.data.type === "proforma" ? "proforma" : "invoice"
    const count = await prisma.invoice.count({
      where: { organizationId: ctx.organizationId, type: typeFilter },
    })
    const invoiceNumber = parsed.data.type === "proforma"
      ? `PF-${year}-${String(count + 1).padStart(4, "0")}`
      : `${year}-${String(count + 1).padStart(4, "0")}`

    // Calculate totals from line items (all in öre)
    const lines = parsed.data.lineItems.map((l, i) => {
      const unitPrice  = Math.round(l.unitPriceKr * 100)
      const lineTotal  = Math.round(l.quantity * unitPrice * (1 - l.discountRate))
      const taxAmount  = Math.round(lineTotal * l.taxRate)
      return {
        description:  l.description,
        quantity:     l.quantity,
        unit:         l.unit,
        unitPrice:    BigInt(unitPrice),
        taxRate:      l.taxRate,
        discountRate: l.discountRate,
        lineTotal:    BigInt(lineTotal),
        taxAmount:    BigInt(taxAmount),
        productId:    l.productId ?? null,
        sortOrder:    l.sortOrder ?? i,
        organizationId: ctx.organizationId,
      }
    })

    const subtotalAmount = lines.reduce((s, l) => s + Number(l.lineTotal), 0)
    const taxAmount      = lines.reduce((s, l) => s + Number(l.taxAmount), 0)
    const discountAmount = parsed.data.lineItems.reduce((s, l) => {
      const gross = Math.round(l.quantity * Math.round(l.unitPriceKr * 100))
      const net   = Math.round(l.quantity * Math.round(l.unitPriceKr * 100) * (1 - l.discountRate))
      return s + (gross - net)
    }, 0)
    const totalAmount = subtotalAmount + taxAmount

    const invoice = await prisma.invoice.create({
      data: {
        organizationId:   ctx.organizationId,
        invoiceNumber,
        type:             parsed.data.type ?? "invoice",
        contactId:        parsed.data.contactId ?? null,
        issueDate:        new Date(parsed.data.issueDate),
        dueDate:          new Date(parsed.data.dueDate),
        currency:         parsed.data.currency,
        reference:        parsed.data.reference ?? null,
        poNumber:         parsed.data.poNumber  ?? null,
        notes:            parsed.data.notes     ?? null,
        footerText:       parsed.data.footerText ?? null,
        subtotalAmount:   BigInt(subtotalAmount),
        taxAmount:        BigInt(taxAmount),
        discountAmount:   BigInt(discountAmount),
        totalAmount:      BigInt(totalAmount),
        paidAmount:       BigInt(0),
        createdByUserId:  ctx.userId,
        lineItems: { create: lines },
      },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        contact:   { select: { id: true, name: true } },
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "Invoice",
        entityId:       invoice.id,
        after: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount.toString() },
      },
    }).catch(() => {})

    indexInvoice(ctx.organizationId, {
      ...invoice,
      billingName: invoice.billingName ?? invoice.contact?.name ?? null,
    })

    return Response.json(invoice, { status: 201 })
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
  console.error("[invoices]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
