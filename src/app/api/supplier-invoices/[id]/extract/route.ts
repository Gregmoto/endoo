/**
 * POST /api/supplier-invoices/[id]/extract
 *
 * Triggers Claude Vision AI extraction on the uploaded file.
 * Idempotent — a second call while extraction is running returns 409.
 * A second call after completion returns the cached extracted data.
 */

import { NextRequest }                  from "next/server"
import { requireAuth }                  from "@/lib/rbac/guards"
import { canOrThrow }                   from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { extractSupplierInvoice }       from "@/services/supplier-invoices/extraction"
import { prisma }                       from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.UPLOAD)
    const { id } = await params

    // Verify ownership
    const invoice = await prisma.supplierInvoice.findFirst({
      where:  { id, organizationId: ctx.organizationId },
      select: { id: true, extractionStatus: true, aiExtractedData: true },
    })
    if (!invoice) return Response.json({ error: "Not found" }, { status: 404 })

    // Already done — return cached data
    if (invoice.extractionStatus === "completed" && invoice.aiExtractedData) {
      return Response.json({ extracted: invoice.aiExtractedData, cached: true })
    }

    // Already running
    if (invoice.extractionStatus === "processing") {
      return Response.json({ error: "extraction_in_progress" }, { status: 409 })
    }

    const extracted = await extractSupplierInvoice(ctx.organizationId, id)

    return Response.json({ extracted })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")          return Response.json({ error: "Unauthorized" },         { status: 401 })
      if (err.message === "Unauthorized")             return Response.json({ error: "Forbidden" },            { status: 403 })
      if (err.message.startsWith("extraction_in_progress")) return Response.json({ error: err.message },      { status: 409 })
    }
    console.error("[extract]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
