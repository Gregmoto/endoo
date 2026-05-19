/**
 * GET  /api/invoices  — list invoices with pagination, tabs, filters, counts
 * POST /api/invoices  — create invoice with line items
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { getOrgPlan, enforceLimit } from "@/lib/plans/guard"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma, type InvoiceType, type InvoiceStatus } from "@prisma/client"
import { z } from "zod"
import { indexInvoice } from "@/lib/search/index-entity"

// ─── Tab → status filter mapping ─────────────────────────────────────────────

function tabToWhere(tab: string, orgId: string): Prisma.InvoiceWhereInput {
  const base: Prisma.InvoiceWhereInput = { organizationId: orgId, deletedAt: null }
  const today = new Date(); today.setHours(23, 59, 59, 999)

  switch (tab) {
    case "unbooked":
      return { ...base, status: "draft" }
    case "unpaid":
      return { ...base, status: { in: ["sent", "viewed", "partial", "overdue"] } }
    case "paid":
      return { ...base, status: "paid" }
    case "void":
      return { ...base, status: { in: ["void", "uncollectable"] } }
    default: // "all"
      return base
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:read")

    const url       = new URL(req.url)
    const tab       = url.searchParams.get("tab")       ?? "all"
    const search    = url.searchParams.get("q")         ?? url.searchParams.get("search") ?? ""
    const dateFrom  = url.searchParams.get("from")      ?? url.searchParams.get("dateFrom") ?? ""
    const dateTo    = url.searchParams.get("to")        ?? url.searchParams.get("dateTo") ?? ""
    const contactId = url.searchParams.get("contactId") ?? ""
    const typeParam = url.searchParams.get("type")      ?? ""
    const statusParam = url.searchParams.get("status")  ?? ""
    const sortParam = url.searchParams.get("sort")      ?? "issueDate:desc"
    const page      = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const size      = Math.min(250, Math.max(1, parseInt(url.searchParams.get("size") ?? "25")))

    const baseWhere = tabToWhere(tab, ctx.organizationId)

    // Additional filters on top of tab filter
    const extraConditions: Prisma.InvoiceWhereInput[] = []

    if (search) {
      extraConditions.push({
        OR: [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { billingName:   { contains: search, mode: "insensitive" } },
          { billingEmail:  { contains: search, mode: "insensitive" } },
          { poNumber:      { contains: search, mode: "insensitive" } },
          { ourReference:  { contains: search, mode: "insensitive" } },
          { yourReference: { contains: search, mode: "insensitive" } },
        ],
      })
    }
    if (dateFrom) extraConditions.push({ issueDate: { gte: new Date(dateFrom) } })
    if (dateTo)   extraConditions.push({ issueDate: { lte: new Date(dateTo) } })
    if (contactId) extraConditions.push({ contactId })
    if (typeParam) {
      const types = typeParam.split(",").filter(Boolean) as InvoiceType[]
      extraConditions.push({ type: { in: types } })
    }
    if (statusParam) {
      const statuses = statusParam.split(",").filter(Boolean) as InvoiceStatus[]
      extraConditions.push({ status: { in: statuses } })
    }

    const where: Prisma.InvoiceWhereInput =
      extraConditions.length > 0
        ? { AND: [baseWhere, ...extraConditions] }
        : baseWhere

    // Build orderBy
    const orderBy: Prisma.InvoiceOrderByWithRelationInput[] = sortParam
      .split(",")
      .map(s => {
        const [field, dir] = s.trim().split(":")
        const direction = dir === "asc" ? "asc" : "desc"
        if (field === "contact") return { contact: { name: direction } }
        return { [field]: direction } as Prisma.InvoiceOrderByWithRelationInput
      })

    // Counts for tab badges — run in parallel with data query
    const orgBase: Prisma.InvoiceWhereInput = { organizationId: ctx.organizationId, deletedAt: null }

    const [data, total, counts] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy,
        take: size,
        skip: (page - 1) * size,
        include: {
          contact: { select: { id: true, name: true, customerNumber: true } },
        },
      }),
      prisma.invoice.count({ where }),
      Promise.all([
        prisma.invoice.count({ where: orgBase }),
        prisma.invoice.count({ where: { ...orgBase, status: "draft" } }),
        prisma.invoice.count({ where: { ...orgBase, status: { in: ["sent", "viewed", "partial", "overdue"] } } }),
        prisma.invoice.count({ where: { ...orgBase, status: "paid" } }),
        prisma.invoice.count({ where: { ...orgBase, status: { in: ["void", "uncollectable"] } } }),
      ]),
    ])

    const [countAll, countUnbooked, countUnpaid, countPaid, countVoid] = counts

    return Response.json({
      data,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
      counts: {
        all:      countAll,
        unbooked: countUnbooked,
        unpaid:   countUnpaid,
        paid:     countPaid,
        void:     countVoid,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}

// ─── Line item schema ─────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  description:       z.string().max(1000).default(""),
  quantity:          z.number().default(1),
  orderedQuantity:   z.number().optional().nullable(),
  deliveredQuantity: z.number().optional().nullable(),
  unit:              z.string().max(30).default("st"),
  unitPriceOre:      z.number().int().min(0).default(0),  // öre
  taxRate:           z.number().min(0).max(1).default(0.25),
  discountRate:      z.number().min(0).max(1).default(0),
  productId:         z.string().uuid().optional().nullable(),
  articleNumber:     z.string().max(100).optional().nullable(),
  accountNumber:     z.string().max(10).optional().nullable(),
  vatType:           z.string().max(30).optional().nullable(),
  warehouseLocation: z.string().max(100).optional().nullable(),
  purchasePrice:     z.number().int().optional().nullable(),
  sortOrder:         z.number().int().default(0),
  isInfoRow:         z.boolean().default(false),
})

const CreateSchema = z.object({
  contactId:             z.string().uuid().optional().nullable(),
  issueDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:               z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  currency:              z.string().max(3).default("SEK"),
  exchangeRate:          z.number().optional().nullable(),
  type:                  z.enum(["invoice","proforma","credit_note","recurring","cash","interest"]).default("invoice"),
  status:                z.enum(["draft","sent","viewed","partial","paid","overdue","void","uncollectable"]).default("draft"),
  paymentTermsDays:      z.number().int().min(0).optional().nullable(),
  ourReference:          z.string().max(255).optional().nullable(),
  yourReference:         z.string().max(255).optional().nullable(),
  yourOrderNumber:       z.string().max(100).optional().nullable(),
  priceListId:           z.string().uuid().optional().nullable(),
  invoiceLang:           z.string().max(5).default("sv"),
  vatType:               z.string().max(30).optional().nullable(),
  priceIncludesVat:      z.boolean().default(false),
  freightAmount:         z.number().int().default(0),
  invoiceFeeAmount:      z.number().int().default(0),
  invoiceDiscountRate:   z.number().min(0).max(1).default(0),
  freeText:              z.string().max(2000).optional().nullable(),
  shipmentMark:          z.string().max(255).optional().nullable(),
  cashAccount:           z.string().max(10).optional().nullable(),
  billingName:           z.string().max(255).optional().nullable(),
  billingEmail:          z.string().max(255).optional().nullable(),
  billingOrgNumber:      z.string().max(50).optional().nullable(),
  billingAddress:        z.unknown().optional().nullable(),
  deliveryName:          z.string().max(255).optional().nullable(),
  deliveryLine1:         z.string().max(255).optional().nullable(),
  deliveryLine2:         z.string().max(255).optional().nullable(),
  deliveryPostalCode:    z.string().max(20).optional().nullable(),
  deliveryCity:          z.string().max(100).optional().nullable(),
  deliveryCountry:       z.string().max(2).optional().nullable(),
  deliveryDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  deliveryMethodId:      z.string().uuid().optional().nullable(),
  deliveryTermsId:       z.string().uuid().optional().nullable(),
  notes:                 z.string().max(5000).optional().nullable(),
  footerText:            z.string().max(5000).optional().nullable(),
  internalNotes:         z.string().max(5000).optional().nullable(),
  roundingMode:          z.string().default("auto"),
  updateInventory:       z.boolean().default(false),
  lineItems:             z.array(LineItemSchema).default([]),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:create")

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const d = parsed.data

    // Plan limit check
    if (d.type === "invoice") {
      const plan = await getOrgPlan(ctx.organizationId)
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const monthCount = await prisma.invoice.count({
        where: { organizationId: ctx.organizationId, type: "invoice", createdAt: { gte: monthStart } },
      })
      enforceLimit(plan, "maxInvoicesPerMonth", monthCount)
    }

    // Generate invoice number from org prefix + sequence
    const org = await prisma.organization.findFirst({
      where:  { id: ctx.organizationId },
      select: { invoicePrefix: true, invoiceSequenceStart: true },
    })
    const prefix = org?.invoicePrefix ?? "F"
    const existingCount = await prisma.invoice.count({
      where: { organizationId: ctx.organizationId, type: { in: ["invoice", "cash"] as InvoiceType[] } },
    })
    const seqStart    = org?.invoiceSequenceStart ?? 1
    const seqNum      = seqStart + existingCount
    const invoiceNumber = d.type === "proforma"
      ? `PF-${String(seqNum).padStart(4, "0")}`
      : d.type === "credit_note"
      ? `KR-${String(seqNum).padStart(4, "0")}`
      : d.type === "interest"
      ? `RF-${String(seqNum).padStart(4, "0")}`
      : `${prefix}-${String(seqNum).padStart(4, "0")}`

    // Calculate due date from payment terms if not set
    let dueDate = d.dueDate ? new Date(d.dueDate) : new Date(d.issueDate)
    if (!d.dueDate && d.paymentTermsDays != null) {
      dueDate = new Date(d.issueDate)
      dueDate.setDate(dueDate.getDate() + d.paymentTermsDays)
    }
    if (d.type === "cash") {
      dueDate = new Date(d.issueDate)  // cash invoices due immediately
    }

    // Calculate totals
    const lineData = d.lineItems.map((l, i) => {
      const qty         = l.quantity
      const unitPrice   = l.unitPriceOre
      const afterDisc   = Math.round(qty * unitPrice * (1 - l.discountRate))
      const taxAmt      = l.isInfoRow ? 0 : Math.round(afterDisc * l.taxRate)
      return {
        description:       l.description,
        quantity:          qty,
        orderedQuantity:   l.orderedQuantity ?? qty,
        deliveredQuantity: l.deliveredQuantity ?? qty,
        unit:              l.unit,
        unitPrice:         BigInt(unitPrice),
        taxRate:           l.taxRate,
        discountRate:      l.discountRate,
        lineTotal:         BigInt(afterDisc),
        taxAmount:         BigInt(taxAmt),
        productId:         l.productId    ?? null,
        articleNumber:     l.articleNumber ?? null,
        accountNumber:     l.accountNumber ?? null,
        vatType:           l.vatType       ?? null,
        warehouseLocation: l.warehouseLocation ?? null,
        purchasePrice:     l.purchasePrice != null ? BigInt(l.purchasePrice) : null,
        sortOrder:         l.sortOrder ?? i,
        organizationId:    ctx.organizationId,
      }
    })

    const subtotalAmount  = lineData.reduce((s, l) => s + Number(l.lineTotal), 0)
    const taxAmount       = lineData.reduce((s, l) => s + Number(l.taxAmount), 0)
    const invoiceDiscount = Math.round(subtotalAmount * d.invoiceDiscountRate)
    const netAmount       = subtotalAmount - invoiceDiscount
    const totalAmount     = netAmount + taxAmount + d.freightAmount + d.invoiceFeeAmount

    const invoice = await prisma.invoice.create({
      data: {
        organizationId:      ctx.organizationId,
        invoiceNumber,
        type:                d.type as InvoiceType,
        status:              d.status as InvoiceStatus,
        contactId:           d.contactId    ?? null,
        issueDate:           new Date(d.issueDate),
        dueDate,
        currency:            d.currency,
        exchangeRate:        d.exchangeRate ?? null,
        paymentTermsDays:    d.paymentTermsDays ?? null,
        ourReference:        d.ourReference   ?? null,
        yourReference:       d.yourReference  ?? null,
        yourOrderNumber:     d.yourOrderNumber ?? null,
        priceListId:         d.priceListId    ?? null,
        invoiceLang:         d.invoiceLang,
        vatType:             d.vatType        ?? null,
        priceIncludesVat:    d.priceIncludesVat,
        freightAmount:       BigInt(d.freightAmount),
        invoiceFeeAmount:    BigInt(d.invoiceFeeAmount),
        invoiceDiscountRate: d.invoiceDiscountRate,
        freeText:            d.freeText       ?? null,
        shipmentMark:        d.shipmentMark   ?? null,
        cashAccount:         d.cashAccount    ?? null,
        billingName:         d.billingName    ?? null,
        billingEmail:        d.billingEmail   ?? null,
        billingAddress:      (d.billingAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        deliveryName:        d.deliveryName   ?? null,
        deliveryLine1:       d.deliveryLine1  ?? null,
        deliveryLine2:       d.deliveryLine2  ?? null,
        deliveryPostalCode:  d.deliveryPostalCode ?? null,
        deliveryCity:        d.deliveryCity   ?? null,
        deliveryCountry:     d.deliveryCountry ?? null,
        deliveryDate:        d.deliveryDate ? new Date(d.deliveryDate) : null,
        deliveryMethodId:    d.deliveryMethodId ?? null,
        deliveryTermsId:     d.deliveryTermsId  ?? null,
        notes:               d.notes          ?? null,
        footerText:          d.footerText     ?? null,
        subtotalAmount:      BigInt(subtotalAmount),
        taxAmount:           BigInt(taxAmount),
        netAmount:           BigInt(netAmount),
        grossAmount:         BigInt(totalAmount),
        totalAmount:         BigInt(totalAmount),
        discountAmount:      BigInt(invoiceDiscount),
        paidAmount:          BigInt(0),
        createdByUserId:     ctx.userId,
        lineItems: { create: lineData },
      },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        contact:   { select: { id: true, name: true, customerNumber: true } },
      },
    })

    // Cash invoice: auto-create payment
    if (d.type === "cash") {
      await prisma.payment.create({
        data: {
          organizationId: ctx.organizationId,
          invoiceId:      invoice.id,
          amount:         BigInt(totalAmount),
          currency:       d.currency,
          paymentDate:    new Date(d.issueDate),
          method:         "cash",
        },
      })
      await prisma.invoice.update({
        where: { id: invoice.id },
        data:  { status: "paid", paidAt: new Date(d.issueDate), paidAmount: BigInt(totalAmount) },
      })
    }

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "Invoice",
        entityId:       invoice.id,
        after: { invoiceNumber: invoice.invoiceNumber, type: invoice.type, totalAmount: invoice.totalAmount.toString() },
      },
    }).catch(() => {})

    const contactName = (invoice as { contact?: { name?: string } | null }).contact?.name ?? null
    indexInvoice(ctx.organizationId, {
      ...invoice,
      billingName: invoice.billingName ?? contactName ?? null,
    })

    return Response.json(invoice, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  return handleApiError(err, "invoices")
}
