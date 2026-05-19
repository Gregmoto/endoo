import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk } from "@/lib/api/response"
import { toJSON } from "@/lib/serialize"
import { Prisma, InvoiceStatus } from "@prisma/client"
import { z } from "zod"

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manuella betalningar",
}

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "payments:read")

    const url  = new URL(req.url)
    const from = url.searchParams.get("from") ?? ""
    const to   = url.searchParams.get("to")   ?? ""
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get("size") ?? "25")))

    const dateFilter: Prisma.DateTimeFilter<"Payment"> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to)   dateFilter.lte = new Date(to)

    const where: Prisma.PaymentWhereInput = {
      organizationId: ctx.organizationId,
      ...(from || to ? { paymentDate: dateFilter } : {}),
    }

    const [total, payments] = await prisma.$transaction([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { paymentDate: "desc" },
        skip:  (page - 1) * size,
        take:  size,
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              billingName:   true,
              contactId:     true,
              dueDate:       true,
            },
          },
        },
      }),
    ])

    const unmatchedTotal = await prisma.unmatchedPayment.aggregate({
      where: { organizationId: ctx.organizationId, status: "unmatched" },
      _sum: { amount: true },
    })

    // Group page's payments by paymentDate
    const grouped = new Map<string, typeof payments>()
    for (const p of payments) {
      const key = p.paymentDate.toISOString().slice(0, 10)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(p)
    }

    const groups = Array.from(grouped.entries()).map(([date, items]) => ({
      date,
      source:      "manual" as const,
      label:       SOURCE_LABELS["manual"],
      totalAmount: items.reduce((s, p) => s + Number(p.amount), 0),
      currency:    "SEK",
      payments:    items.map((p) => ({
        id:          p.id,
        amount:      p.amount.toString(),
        currency:    p.currency,
        paymentDate: p.paymentDate.toISOString().slice(0, 10),
        method:      p.method,
        reference:   p.reference,
        invoiceId:   p.invoiceId,
        invoice:     {
          invoiceNumber: p.invoice.invoiceNumber,
          billingName:   p.invoice.billingName,
          contactId:     p.invoice.contactId,
          dueDate:       p.invoice.dueDate.toISOString().slice(0, 10),
        },
        createdAt: p.createdAt,
      })),
    }))

    return Response.json(toJSON({
      groups,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
      ungroupedTotal: Number(unmatchedTotal._sum.amount ?? 0),
    }))
  } catch (err) {
    return handleApiError(err, "payments:GET")
  }
}

const PostPaymentSchema = z.object({
  invoiceId:   z.string().uuid(),
  amountKr:    z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method:      z.enum(["bank_transfer", "card", "swish", "cash", "other"]).default("bank_transfer"),
  reference:   z.string().max(255).optional().nullable(),
  notes:       z.string().max(2000).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "payments:create")

    const body   = await req.json()
    const parsed = PostPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { invoiceId, amountKr, paymentDate, method, reference, notes } = parsed.data

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })

    const amountOre    = Math.round(amountKr * 100)
    const newPaidAmount = Number(invoice.paidAmount) + amountOre
    const newStatus: InvoiceStatus =
      newPaidAmount >= Number(invoice.totalAmount) ? "paid" :
      newPaidAmount > 0                            ? "partial" :
      invoice.status as InvoiceStatus

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          organizationId:  ctx.organizationId,
          invoiceId,
          amount:          BigInt(amountOre),
          currency:        invoice.currency,
          paymentDate:     new Date(paymentDate),
          method,
          reference:       reference ?? null,
          notes:           notes ?? null,
          createdByUserId: ctx.userId,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId, organizationId: ctx.organizationId },
        data: {
          paidAmount: BigInt(newPaidAmount),
          status:     newStatus,
          ...(newStatus === "paid" ? { paidAt: new Date(paymentDate) } : {}),
        },
      }),
    ])

    return apiOk(payment, { status: 201 } as ResponseInit)
  } catch (err) {
    return handleApiError(err, "payments:POST")
  }
}
