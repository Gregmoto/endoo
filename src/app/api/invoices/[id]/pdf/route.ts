/**
 * GET /api/invoices/[id]/pdf
 *
 * Streams a PDF of the invoice. Returns Content-Disposition: attachment.
 * Requires invoices:read permission.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { renderToStream, type DocumentProps } from "@react-pdf/renderer"
import { InvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf"
import React, { type ReactElement } from "react"

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
      include: {
        contact: {
          select: {
            name: true, email: true,
            addressLine1: true, city: true, postalCode: true,
          },
        },
        lineItems: {
          orderBy: { sortOrder: "asc" },
          select: {
            description: true, quantity: true, unit: true,
            unitPrice: true, taxRate: true, discountRate: true, lineTotal: true,
          },
        },
        organization: {
          select: {
            name: true,
            addressLine1: true, city: true, postalCode: true,
            contactEmail: true, vatNumber: true,
          },
        },
      },
    })

    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })

    const org = invoice.organization
    const orgAddressParts = [org.addressLine1, [org.postalCode, org.city].filter(Boolean).join(" ")].filter(Boolean)
    const orgAddress = orgAddressParts.length ? orgAddressParts.join(", ") : null

    const c = invoice.contact
    const contactAddressParts = c ? [c.addressLine1, [c.postalCode, c.city].filter(Boolean).join(" ")].filter(Boolean) : []
    const contactAddress = contactAddressParts.length ? contactAddressParts.join(", ") : null

    const data: InvoicePdfData = {
      invoiceNumber:  invoice.invoiceNumber ?? "Utkast",
      invoiceType:    invoice.type,
      issueDate:      invoice.issueDate.toLocaleDateString("sv-SE"),
      dueDate:        invoice.dueDate.toLocaleDateString("sv-SE"),
      currency:       invoice.currency,
      orgName:        org.name,
      orgAddress,
      orgEmail:       org.contactEmail ?? null,
      orgVatNumber:   org.vatNumber ?? null,
      contactName:    c?.name ?? "—",
      contactAddress,
      notes:          invoice.notes ?? null,
      footerText:     invoice.footerText ?? null,
      reference:      invoice.reference ?? null,
      lines: invoice.lineItems.map(l => ({
        description:  l.description,
        quantity:     Number(l.quantity),
        unit:         l.unit,
        unitPrice:    Number(l.unitPrice),
        taxRate:      Number(l.taxRate),
        discountRate: Number(l.discountRate),
        total:        Number(l.lineTotal),
      })),
      subtotalAmount:  Number(invoice.subtotalAmount),
      taxAmount:       Number(invoice.taxAmount),
      discountAmount:  Number(invoice.discountAmount),
      totalAmount:     Number(invoice.totalAmount),
    }

    const stream = await renderToStream(
      React.createElement(InvoicePdf, { d: data }) as ReactElement<DocumentProps>
    )

    const chunks: Buffer[] = []
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const pdf = Buffer.concat(chunks)

    return new Response(pdf, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber ?? "utkast"}.pdf"`,
        "Content-Length":      String(pdf.length),
      },
    })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") {
      return Response.json({ error: "Ej inloggad" }, { status: 401 })
    }
    if ((err as { name?: string }).name === "UnauthorizedError") {
      return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    }
    console.error("[invoices/pdf]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
