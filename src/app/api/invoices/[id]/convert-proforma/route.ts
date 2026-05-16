/**
 * POST /api/invoices/[id]/convert-proforma
 *
 * Converts a proforma invoice to a regular invoice.
 * - Generates a new sequential invoice number
 * - Changes type from proforma → invoice
 * - Status remains draft (user can then send it)
 *
 * Requires: invoices:update, same org, type must be proforma.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:update")

    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true, type: true, status: true, invoiceNumber: true },
    })

    if (!invoice) {
      return Response.json({ error: "Fakturan hittades ej" }, { status: 404 })
    }

    if (invoice.type !== "proforma") {
      return Response.json({ error: "Enbart proformafakturor kan konverteras" }, { status: 422 })
    }

    if (invoice.status !== "draft") {
      return Response.json({ error: "Enbart utkast kan konverteras" }, { status: 422 })
    }

    // Generate a regular invoice number: YYYY-NNNN
    const year  = new Date().getFullYear()
    const count = await prisma.invoice.count({
      where: { organizationId: ctx.organizationId, type: "invoice" },
    })
    const invoiceNumber = `${year}-${String(count + 1).padStart(4, "0")}`

    const updated = await prisma.invoice.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { type: "invoice", invoiceNumber },
      select: { id: true, invoiceNumber: true },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Invoice",
        entityId:       id,
        before: { type: "proforma", invoiceNumber: invoice.invoiceNumber },
        after:  { type: "invoice",  invoiceNumber: updated.invoiceNumber },
        meta:   { event: "proforma_converted" },
      },
    }).catch(() => {})

    return Response.json({ id: updated.id, invoiceNumber: updated.invoiceNumber })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") {
      return Response.json({ error: "Ej inloggad" }, { status: 401 })
    }
    if ((err as { name?: string }).name === "UnauthorizedError") {
      return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    }
    console.error("[invoices/convert-proforma]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
