/**
 * GET /api/invoices/[id]/pdf
 * Streams a PDF using the Swedish-standard invoice template.
 * Requires invoices:read permission.
 */

export const runtime = "nodejs"

import { prisma }       from "@/lib/prisma"
import { requireAuth }  from "@/lib/rbac/guards"
import { canOrThrow }   from "@/lib/rbac/policy"
import { renderToStream, type DocumentProps } from "@react-pdf/renderer"
import { InvoicePdf }   from "@/lib/pdf/templates/invoice/InvoicePdf"
import type { InvoicePdfData, InvoicePdfLine, InvoiceTemplateData, VatBreakdownRow } from "@/lib/pdf/templates/invoice/InvoicePdfTypes"
import { resolveBranding } from "@/lib/branding/resolver"
import React, { type ReactElement } from "react"
import QRCode from "qrcode"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractBillingLines(
  billingAddress: unknown,
  contact: { addressLine1?: string | null; addressLine2?: string | null; postalCode?: string | null; city?: string | null } | null
): string[] {
  if (billingAddress && typeof billingAddress === "object") {
    const a = billingAddress as Record<string, unknown>
    const lines: string[] = []
    const line1 = String(a.addressLine1 ?? a.line1 ?? "").trim()
    const line2 = String(a.addressLine2 ?? a.line2 ?? "").trim()
    const postal = String(a.postalCode ?? a.postal_code ?? "").trim()
    const city   = String(a.city ?? "").trim()
    if (line1)  lines.push(line1)
    if (line2)  lines.push(line2)
    const cityLine = [postal, city].filter(Boolean).join(" ")
    if (cityLine) lines.push(cityLine)
    if (lines.length > 0) return lines
  }
  if (!contact) return []
  const lines: string[] = []
  if (contact.addressLine1) lines.push(contact.addressLine1)
  if (contact.addressLine2) lines.push(contact.addressLine2)
  const cityLine = [contact.postalCode, contact.city].filter(Boolean).join(" ")
  if (cityLine) lines.push(cityLine)
  return lines
}

function getInterestRate(invoicingSettings: unknown): number | null {
  if (!invoicingSettings || typeof invoicingSettings !== "object") return null
  const s = invoicingSettings as Record<string, unknown>
  const v = s.interestRatePercent
  return typeof v === "number" && v > 0 ? v : null
}

// Swedish Bankgiro OCR: invoice digits + Luhn mod-10 check digit
function computeOcr(invoiceNumber: string): string {
  const digits = invoiceNumber.replace(/\D/g, "")
  if (!digits) return invoiceNumber
  let sum = 0
  let doDouble = true
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i])
    if (doDouble) { d *= 2; if (d > 9) d -= 9 }
    sum += d
    doDouble = !doDouble
  }
  return digits + ((10 - (sum % 10)) % 10)
}

// Group line totals by tax rate for per-rate VAT breakdown (Bokföringslagen)
function computeVatBreakdown(
  lineItems: Array<{ taxRate: unknown; lineTotal: unknown }>
): VatBreakdownRow[] {
  const map = new Map<number, { base: number; tax: number }>()
  for (const l of lineItems) {
    const rate = Number(l.taxRate)          // e.g. 0.25
    const base = Number(l.lineTotal)        // öre, net excl tax
    const pct  = Math.round(rate * 100)     // e.g. 25
    const prev = map.get(pct) ?? { base: 0, tax: 0 }
    map.set(pct, {
      base: prev.base + base,
      tax:  prev.tax + Math.round(base * rate),
    })
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([rate, { base, tax }]) => ({ rate, base, tax }))
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:read")
    const { id } = await params

    const [invoice, template, org, branding] = await Promise.all([
      prisma.invoice.findFirst({
        where: { id, organizationId: ctx.organizationId, deletedAt: null },
        include: {
          contact: {
            select: {
              name: true, vatNumber: true, customerNumber: true,
              addressLine1: true, addressLine2: true, city: true, postalCode: true,
            },
          },
          lineItems: {
            orderBy: { sortOrder: "asc" },
            select: {
              description: true, quantity: true, unit: true,
              unitPrice: true, taxRate: true, discountRate: true, lineTotal: true,
              articleNumber: true, orderedQuantity: true, deliveredQuantity: true,
              sortOrder: true,
            },
          },
        },
      }),
      prisma.invoiceTemplate2.findFirst({
        where: { organizationId: ctx.organizationId, isDefault: true, isActive: true },
      }),
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { name: true, invoicingSettings: true },
      }),
      resolveBranding(ctx.organizationId),
    ])

    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })

    const lang = (invoice.invoiceLang ?? "sv") as "sv" | "en"
    const c    = invoice.contact

    // ── Template data ──────────────────────────────────────────────────────────
    const tmpl: InvoiceTemplateData = {
      logoUrl:         template?.logoUrl        ?? null,
      showLogo:        template?.showLogo        ?? true,
      footerText:      template?.footerText      ?? null,
      postalAddress:   template?.postalAddress   ?? null,
      streetAddress:   template?.streetAddress   ?? null,
      phone:           template?.phone           ?? null,
      fax:             template?.fax             ?? null,
      bankgiro:        template?.bankgiro        ?? null,
      plusgiro:        template?.plusgiro        ?? null,
      iban:            template?.iban            ?? null,
      bic:             template?.bic             ?? null,
      email:           template?.email           ?? null,
      website:         template?.website         ?? null,
      vatNumber:       template?.vatNumber       ?? null,
      fScattCertified: template?.fScattCertified ?? false,
      showSwishQr:     template?.showSwishQr     ?? false,
      swishNumber:     template?.swishNumber     ?? null,
      boardSeat:       template?.boardSeat       ?? null,
    }

    // ── Billing address ────────────────────────────────────────────────────────
    const billingLines = extractBillingLines(invoice.billingAddress, c ?? null)

    // ── Delivery address ───────────────────────────────────────────────────────
    const deliveryLines: string[] = []
    if (invoice.deliveryLine1) deliveryLines.push(invoice.deliveryLine1)
    if (invoice.deliveryLine2) deliveryLines.push(invoice.deliveryLine2)
    const deliveryCityLine = [invoice.deliveryPostalCode, invoice.deliveryCity].filter(Boolean).join(" ")
    if (deliveryCityLine) deliveryLines.push(deliveryCityLine)
    const hasDelivery = !!(invoice.deliveryName || deliveryLines.length > 0)

    // ── Line items ─────────────────────────────────────────────────────────────
    const lines: InvoicePdfLine[] = invoice.lineItems.map(l => {
      const qty      = Number(l.quantity)
      const price    = Number(l.unitPrice)
      const total    = Number(l.lineTotal)
      const isInfo   = qty === 0 && price === 0
      return {
        articleNumber: l.articleNumber ?? null,
        description:   l.description,
        quantity:      qty,
        deliveredQty:  l.deliveredQuantity != null ? Number(l.deliveredQuantity) : null,
        unit:          l.unit,
        unitPrice:     price,
        discountRate:  Number(l.discountRate),
        lineTotal:     total,
        isInfoRow:     isInfo,
      }
    })

    // ── Swish QR ───────────────────────────────────────────────────────────────
    let swishQrDataUrl: string | null = null
    if (tmpl.showSwishQr && tmpl.swishNumber) {
      const totalKr = (Number(invoice.totalAmount) / 100).toFixed(2)
      const payload = `C${tmpl.swishNumber};${totalKr};${invoice.invoiceNumber};0`
      swishQrDataUrl = await QRCode.toDataURL(payload, { width: 120, margin: 1 })
    }

    // ── Assemble data ──────────────────────────────────────────────────────────
    const data: InvoicePdfData = {
      lang,
      invoiceType:    invoice.type,
      invoiceNumber:  invoice.invoiceNumber ?? "Utkast",
      issueDate:      invoice.issueDate.toLocaleDateString("sv-SE"),
      dueDate:        invoice.dueDate.toLocaleDateString("sv-SE"),
      currency:       invoice.currency,
      orgName:        org?.name ?? "",
      pdfLogoUrl:     branding.pdfLogoUrl ?? null,
      template:       tmpl,
      customerNumber: c?.customerNumber ?? null,
      contactVatNumber: c?.vatNumber ?? null,
      billingName:    invoice.billingName ?? c?.name ?? null,
      billingLines,
      hasDeliveryAddress: hasDelivery,
      deliveryName:   invoice.deliveryName ?? null,
      deliveryLines,
      yourReference:  invoice.yourReference  ?? null,
      ourReference:   invoice.ourReference   ?? null,
      shipmentMark:   invoice.shipmentMark   ?? null,
      yourOrderNumber: invoice.yourOrderNumber ?? null,
      paymentTermsDays: invoice.paymentTermsDays ?? null,
      paymentTermsName: null,   // TODO: join PaymentTerm if name needed
      ocr:            invoice.invoiceNumber ? computeOcr(invoice.invoiceNumber) : null,
      deliveryDate:   invoice.deliveryDate ? invoice.deliveryDate.toLocaleDateString("sv-SE") : null,
      brandingColor:  branding.pdfAccentColor ?? branding.primaryColor ?? null,
      lines,
      notes:          invoice.notes ?? null,
      subtotalAmount: Number(invoice.subtotalAmount),
      freightAmount:  Number(invoice.freightAmount),
      invoiceFeeAmount: Number(invoice.invoiceFeeAmount),
      vatBreakdown:   computeVatBreakdown(invoice.lineItems),
      taxAmount:      Number(invoice.taxAmount),
      roundingAmount: Number(invoice.roundingAmount),
      totalAmount:    Number(invoice.totalAmount),
      interestRatePercent: getInterestRate(org?.invoicingSettings),
      swishQrDataUrl,
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
    const e = err as { name?: string }
    if (e.name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (e.name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[invoices/pdf]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
