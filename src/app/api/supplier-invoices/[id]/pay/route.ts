/**
 * POST /api/supplier-invoices/[id]/pay
 *
 * Marks a booked supplier invoice as paid.
 * Creates a payment journal (DR 2440 / CR bank) and sets status = paid.
 * Idempotent — a second call while payment is running returns 409.
 */

import { NextRequest }                  from "next/server"
import { requireAuth }                  from "@/lib/rbac/guards"
import { canOrThrow }                   from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { paySupplierInvoice,
         SupplierInvoiceAlreadyPaidError,
         SupplierInvoiceNotBookedError,
         SupplierInvoiceNotFoundError }  from "@/services/supplier-invoices/booking"
import { z }                            from "zod"

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  paidAt:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidAmount:        z.number().positive(),                          // SEK
  paymentMethod:     z.enum(["bank_transfer", "swish", "cash", "card", "other"]),
  paymentReference:  z.string().max(200).optional(),
  bankAccountNumber: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.PAY)
    const { id } = await params

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 })
    }

    const result = await paySupplierInvoice({
      organizationId:    ctx.organizationId,
      invoiceId:         id,
      paidByUserId:      ctx.userId,
      paidAt:            new Date(parsed.data.paidAt),
      paidAmount:        BigInt(Math.round(parsed.data.paidAmount * 100)),
      paymentMethod:     parsed.data.paymentMethod as never,
      paymentReference:  parsed.data.paymentReference,
      bankAccountNumber: parsed.data.bankAccountNumber,
    })

    return Response.json(result)
  } catch (err) {
    if (err instanceof SupplierInvoiceAlreadyPaidError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof SupplierInvoiceNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof SupplierInvoiceNotBookedError) {
      return Response.json({ error: err.message }, { status: 422 })
    }
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")              return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")                 return Response.json({ error: "Forbidden" },   { status: 403 })
      if (err.message.startsWith("payment_in_progress"))  return Response.json({ error: err.message },   { status: 409 })
    }
    console.error("[pay]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
