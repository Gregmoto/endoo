/**
 * GET   /api/supplier-invoices/[id]  — fetch single invoice
 * PATCH /api/supplier-invoices/[id]  — update verified fields + run duplicate check
 */

import { NextRequest }                  from "next/server"
import { requireAuth }                  from "@/lib/rbac/guards"
import { canOrThrow }                   from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }                       from "@/lib/prisma"
import { z }                            from "zod"
import { computeDuplicateHash, checkDuplicate } from "@/services/supplier-invoices/duplicates"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  supplierId:        z.string().uuid().optional().nullable(),
  supplierName:      z.string().max(200).optional().nullable(),
  supplierOrgNumber: z.string().max(20).optional().nullable(),
  invoiceNumber:     z.string().max(100).optional().nullable(),
  ocrNumber:         z.string().max(100).optional().nullable(),
  invoiceDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  dueDate:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  bankgiro:          z.string().max(20).optional().nullable(),
  plusgiro:          z.string().max(20).optional().nullable(),
  iban:              z.string().max(40).optional().nullable(),
  currency:          z.string().max(3).optional(),
  amountExclVat:     z.number().optional().nullable(),   // SEK — converted to öre
  vatAmount:         z.number().optional().nullable(),
  amountInclVat:     z.number().optional().nullable(),
  vatRate:           z.number().optional().nullable(),
  status:            z.enum(["approved", "rejected"]).optional(),
  rejectionReason:   z.string().max(500).optional().nullable(),
})

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx      = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.READ)
    const { id }   = await params

    const invoice = await prisma.supplierInvoice.findFirst({
      where:   { id, organizationId: ctx.organizationId },
      include: { supplier: true },
    })
    if (!invoice) return Response.json({ error: "Not found" }, { status: 404 })

    return Response.json({ invoice })
  } catch (err) {
    return handleError(err)
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.REVIEW)
    const { id } = await params

    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 })
    }

    const d = parsed.data
    const toOre = (v: number | null | undefined) =>
      v != null ? BigInt(Math.round(v * 100)) : undefined

    // Build update object
    const updateData: Record<string, unknown> = {
      ...(d.supplierId        !== undefined && { supplierId:        d.supplierId }),
      ...(d.supplierName      !== undefined && { supplierName:      d.supplierName }),
      ...(d.supplierOrgNumber !== undefined && { supplierOrgNumber: d.supplierOrgNumber }),
      ...(d.invoiceNumber     !== undefined && { invoiceNumber:     d.invoiceNumber }),
      ...(d.ocrNumber         !== undefined && { ocrNumber:         d.ocrNumber }),
      ...(d.invoiceDate       !== undefined && { invoiceDate:       d.invoiceDate ? new Date(d.invoiceDate) : null }),
      ...(d.dueDate           !== undefined && { dueDate:           d.dueDate    ? new Date(d.dueDate)     : null }),
      ...(d.bankgiro          !== undefined && { bankgiro:          d.bankgiro }),
      ...(d.plusgiro          !== undefined && { plusgiro:          d.plusgiro }),
      ...(d.iban              !== undefined && { iban:              d.iban }),
      ...(d.currency          !== undefined && { currency:          d.currency }),
      ...(d.amountExclVat     !== undefined && { amountExclVat:     toOre(d.amountExclVat) }),
      ...(d.vatAmount         !== undefined && { vatAmount:         toOre(d.vatAmount) }),
      ...(d.amountInclVat     !== undefined && { amountInclVat:     toOre(d.amountInclVat) }),
      ...(d.vatRate           !== undefined && { vatRate:           d.vatRate }),
    }

    if (d.status === "approved") {
      updateData.status          = "approved"
      updateData.approvedAt      = new Date()
      updateData.approvedByUserId = ctx.userId
    } else if (d.status === "rejected") {
      updateData.status            = "rejected"
      updateData.rejectedAt        = new Date()
      updateData.rejectedByUserId  = ctx.userId
      updateData.rejectionReason   = d.rejectionReason ?? null
    }

    const invoice = await prisma.supplierInvoice.update({
      where: { id, organizationId: ctx.organizationId },
      data:  updateData,
    })

    // Recompute duplicate hash if key fields changed
    if (
      d.invoiceNumber   !== undefined ||
      d.amountInclVat   !== undefined ||
      d.supplierId      !== undefined ||
      d.supplierOrgNumber !== undefined
    ) {
      const supplierKey = invoice.supplierId ?? invoice.supplierOrgNumber ?? invoice.supplierName ?? ""
      if (supplierKey && invoice.invoiceNumber && invoice.amountInclVat) {
        const hash = computeDuplicateHash({
          organizationId: ctx.organizationId,
          supplierKey,
          invoiceNumber:  invoice.invoiceNumber,
          amountInclVat:  invoice.amountInclVat,
        })

        const dupResult = await checkDuplicate({
          organizationId:    ctx.organizationId,
          currentInvoiceId:  id,
          supplierId:        invoice.supplierId,
          supplierOrgNumber: invoice.supplierOrgNumber,
          supplierName:      invoice.supplierName,
          invoiceNumber:     invoice.invoiceNumber,
          amountInclVat:     invoice.amountInclVat,
          invoiceDate:       invoice.invoiceDate,
        })

        await prisma.supplierInvoice.update({
          where: { id },
          data:  { duplicateHash: hash, duplicateCheckAt: new Date() },
        })

        return Response.json({ invoice, duplicate: dupResult })
      }
    }

    return Response.json({ invoice })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" },  { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },     { status: 403 })
  }
  console.error("[supplier-invoices/[id]]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
