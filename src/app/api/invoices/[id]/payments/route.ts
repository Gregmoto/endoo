/**
 * GET  /api/invoices/[id]/payments  — list payments for invoice
 * POST /api/invoices/[id]/payments  — register a payment
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { InvoiceStatus } from "@prisma/client"
import { z } from "zod"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:read")
    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })

    const payments = await prisma.payment.findMany({
      where: { invoiceId: id, organizationId: ctx.organizationId },
      orderBy: { paymentDate: "desc" },
    })
    return Response.json(payments)
  } catch (err) {
    return handleError(err)
  }
}

const PaymentSchema = z.object({
  amountKr:    z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method:      z.enum(["bank_transfer", "card", "swish", "cash", "credit_note", "other"]).default("bank_transfer"),
  reference:   z.string().max(255).optional().nullable(),
  notes:       z.string().max(2000).optional().nullable(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "payments:create")
    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })
    if (invoice.status === "draft") {
      return Response.json({ error: "Kan inte registrera betalning på utkast" }, { status: 422 })
    }
    if (invoice.status === "paid") {
      return Response.json({ error: "Fakturan är redan betald" }, { status: 422 })
    }
    if (["void", "uncollectable"].includes(invoice.status)) {
      return Response.json({ error: "Kan inte registrera betalning på makulerad faktura" }, { status: 422 })
    }

    const body = await req.json()
    const parsed = PaymentSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const amountOre = Math.round(parsed.data.amountKr * 100)
    const balance   = Number(invoice.totalAmount) - Number(invoice.paidAmount)

    if (amountOre > balance) {
      return Response.json({
        error: `Belopp (${parsed.data.amountKr} kr) överstiger saldo (${balance / 100} kr)`,
      }, { status: 422 })
    }

    const newPaidAmount = Number(invoice.paidAmount) + amountOre
    const newStatus: InvoiceStatus =
      newPaidAmount >= Number(invoice.totalAmount) ? "paid" :
      newPaidAmount > 0 ? "partial" :
      invoice.status as InvoiceStatus

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          organizationId:  ctx.organizationId,
          invoiceId:       id,
          amount:          BigInt(amountOre),
          currency:        invoice.currency,
          paymentDate:     new Date(parsed.data.paymentDate),
          method:          parsed.data.method,
          reference:       parsed.data.reference ?? null,
          notes:           parsed.data.notes ?? null,
          createdByUserId: ctx.userId,
        },
      }),
      prisma.invoice.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          paidAmount: BigInt(newPaidAmount),
          status:     newStatus,
          ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
        },
      }),
    ])

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "payment_record",
        entityType:     "Invoice",
        entityId:       id,
        meta: {
          paymentId:   payment.id,
          amountOre,
          method:      parsed.data.method,
          newStatus,
          newPaidAmount,
        },
      },
    }).catch(() => {})

    return Response.json(payment, { status: 201 })
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
  console.error("[invoices/payments]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
