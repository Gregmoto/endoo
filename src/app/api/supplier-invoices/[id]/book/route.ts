/**
 * POST /api/supplier-invoices/[id]/book
 *
 * Books the supplier invoice — creates and posts the AP journal.
 * Idempotent — a second call returns 409 if booking is in progress
 * or the already-booked invoice if complete.
 */

import { NextRequest }                  from "next/server"
import { requireAuth }                  from "@/lib/rbac/guards"
import { canOrThrow }                   from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { bookSupplierInvoice,
         SupplierInvoiceAlreadyBookedError,
         SupplierInvoiceNotFoundError,
         MissingFieldsError }           from "@/services/supplier-invoices/booking"
import { z }                            from "zod"

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  expenseAccountNumber: z.string().min(1),
  vatAccountNumber:     z.string().optional(),
  apAccountNumber:      z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.BOOK)
    const { id } = await params

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 })
    }

    const result = await bookSupplierInvoice({
      organizationId:       ctx.organizationId,
      invoiceId:            id,
      bookedByUserId:       ctx.userId,
      expenseAccountNumber: parsed.data.expenseAccountNumber,
      vatAccountNumber:     parsed.data.vatAccountNumber,
      apAccountNumber:      parsed.data.apAccountNumber,
    })

    return Response.json(result)
  } catch (err) {
    if (err instanceof SupplierInvoiceAlreadyBookedError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof SupplierInvoiceNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof MissingFieldsError) {
      return Response.json({ error: err.message }, { status: 422 })
    }
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")               return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")                  return Response.json({ error: "Forbidden" },   { status: 403 })
      if (err.message.startsWith("booking_in_progress"))   return Response.json({ error: err.message },   { status: 409 })
    }
    console.error("[book]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
