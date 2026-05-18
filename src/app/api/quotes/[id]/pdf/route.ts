export const runtime = "nodejs"

/**
 * GET /api/quotes/[id]/pdf — generate and stream quote PDF
 */

import { prisma }        from "@/lib/prisma"
import { requireAuth }   from "@/lib/rbac/guards"
import { canOrThrow }    from "@/lib/rbac/policy"
import { renderToStream, type DocumentProps } from "@react-pdf/renderer"
import { QuotePdf, type QuotePdfLine } from "@/lib/pdf/quote-pdf"
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "quotes:read")
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        organization: {
          select: { name: true, addressLine1: true, city: true, postalCode: true, contactEmail: true, vatNumber: true },
        },
      },
    })
    if (!quote) return Response.json({ error: "Hittades inte" }, { status: 404 })

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

    let subtotalKr = 0
    let taxKr      = 0
    let discountKr = 0
    for (const l of lines) {
      const gross  = l.quantity * l.unitPriceKr
      const net    = gross * (1 - l.discountRate)
      discountKr  += gross - net
      subtotalKr  += net
      taxKr       += net * l.taxRate
    }
    const totalKr = subtotalKr + taxKr

    const orgAddress = [org.addressLine1, org.postalCode, org.city].filter(Boolean).join(", ")

    const stream = await renderToStream(
      React.createElement(QuotePdf, {
        d: {
          quoteNumber:   quote.number,
          issueDate:     quote.createdAt.toLocaleDateString("sv-SE"),
          validUntil:    quote.validUntil ? quote.validUntil.toLocaleDateString("sv-SE") : null,
          currency:      quote.currency,
          orgName:       org.name,
          orgAddress:    orgAddress || null,
          orgEmail:      org.contactEmail,
          orgVatNumber:  org.vatNumber,
          contactName:   quote.contactName,
          title:         quote.title,
          notes:         quote.notes,
          terms:         quote.terms,
          lines,
          subtotalKr,
          taxKr,
          discountKr,
          totalKr,
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
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") {
      return Response.json({ error: "Ej inloggad" }, { status: 401 })
    }
    if ((err as { name?: string }).name === "UnauthorizedError") {
      return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    }
    console.error("[quotes/pdf]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
