/**
 * GET /api/portal/[orgSlug]/invoices/[id]/pdf
 * Stream the invoice PDF for the authenticated contact.
 */

import { requirePortalAuth, portalUnauthorized } from "@/lib/portal/auth"
import { prisma }           from "@/lib/prisma"
import { resolveBranding }  from "@/lib/branding/resolver"
import { InvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf"
import { renderToStream, type DocumentProps } from "@react-pdf/renderer"
import React, { type ReactElement } from "react"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> }
) {
  const { orgSlug, id } = await params

  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try { claims = await requirePortalAuth(orgSlug) }
  catch { return portalUnauthorized() }

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: claims.orgId, contactId: claims.sub },
    include: {
      contact:  { select: { name: true, email: true, addressLine1: true, city: true, postalCode: true } },
      lineItems: { orderBy: { sortOrder: "asc" }, select: { description: true, quantity: true, unit: true, unitPrice: true, taxRate: true, discountRate: true, lineTotal: true } },
      organization: { select: { name: true, addressLine1: true, city: true, postalCode: true, contactEmail: true, vatNumber: true } },
    },
  })
  if (!invoice) return Response.json({ error: "Faktura hittades inte" }, { status: 404 })

  const branding = await resolveBranding(claims.orgId)
  const org = invoice.organization
  const orgAddress = [org.addressLine1, [org.postalCode, org.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null
  const c = invoice.contact
  const contactAddress = c ? [c.addressLine1, [c.postalCode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null : null

  const data: InvoicePdfData = {
    branding: {
      primaryColor:     branding.primaryColor,
      pdfLogoUrl:       branding.pdfLogoUrl,
      pdfFooterText:    branding.pdfFooterText,
      pdfShowPoweredBy: branding.pdfShowPoweredBy,
      displayName:      branding.displayName,
    },
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
      "Content-Disposition": `inline; filename="faktura-${invoice.invoiceNumber}.pdf"`,
      "Content-Length":      String(pdf.length),
    },
  })
}
