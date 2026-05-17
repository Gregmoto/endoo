/**
 * GET /api/portal/[orgSlug]/quotes/[id]/pdf
 * Stream the quote PDF for the authenticated contact.
 */

import { requirePortalAuth, portalUnauthorized } from "@/lib/portal/auth"
import { prisma }           from "@/lib/prisma"
import { QuotePdf, type QuotePdfLine } from "@/lib/pdf/quote-pdf"
import { renderToStream, type DocumentProps } from "@react-pdf/renderer"
import React, { type ReactElement } from "react"

type RawLine = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> }
) {
  const { orgSlug, id } = await params

  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try { claims = await requirePortalAuth(orgSlug) }
  catch { return portalUnauthorized() }

  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: claims.orgId, contactId: claims.sub, status: { notIn: ["draft", "cancelled"] } },
    include: {
      organization: { select: { name: true, addressLine1: true, city: true, postalCode: true, contactEmail: true, vatNumber: true } },
    },
  })
  if (!quote) return Response.json({ error: "Offert hittades inte" }, { status: 404 })

  const org      = quote.organization
  const rawLines = (Array.isArray(quote.lineItems) ? quote.lineItems : []) as RawLine[]
  const lines: QuotePdfLine[] = rawLines.map(l => ({
    description:  l.description,
    quantity:     l.quantity,
    unit:         l.unit ?? "st",
    unitPriceKr:  l.unitPriceKr ?? 0,
    taxRate:      l.taxRate ?? 0.25,
    discountRate: l.discountRate ?? 0,
  }))

  let subtotalKr = 0, taxKr = 0, discountKr = 0
  for (const l of lines) {
    const gross = l.quantity * l.unitPriceKr
    const net   = gross * (1 - l.discountRate)
    discountKr += gross - net
    subtotalKr += net
    taxKr      += net * l.taxRate
  }

  const stream = await renderToStream(
    React.createElement(QuotePdf, {
      d: {
        quoteNumber:  quote.number,
        issueDate:    quote.createdAt.toLocaleDateString("sv-SE"),
        validUntil:   quote.validUntil?.toLocaleDateString("sv-SE") ?? null,
        currency:     quote.currency,
        orgName:      org.name,
        orgAddress:   [org.addressLine1, org.postalCode, org.city].filter(Boolean).join(", ") || null,
        orgEmail:     org.contactEmail,
        orgVatNumber: org.vatNumber,
        contactName:  quote.contactName,
        title:        quote.title,
        notes:        quote.notes,
        terms:        quote.terms,
        lines,
        subtotalKr,
        taxKr,
        discountKr,
        totalKr:      subtotalKr + taxKr,
      },
    }) as ReactElement<DocumentProps>
  )

  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const pdf = Buffer.concat(chunks)

  return new Response(pdf, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
      "Content-Length":      String(pdf.length),
    },
  })
}
