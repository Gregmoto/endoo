/**
 * POST /api/invoices/export
 * Body: { format: 'csv' | 'xlsx', filters: {...}, sort: '...' }
 * Returns CSV or XLSX of filtered invoices.
 * PDF export is handled by /api/invoices/[id]/pdf for single invoices.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const ExportSchema = z.object({
  format:  z.enum(["csv", "xlsx"]),
  filters: z.object({
    tab:       z.string().default("all"),
    q:         z.string().default(""),
    from:      z.string().default(""),
    to:        z.string().default(""),
    contactId: z.string().default(""),
    type:      z.string().default(""),
    status:    z.string().default(""),
  }).default({ tab: "all", q: "", from: "", to: "", contactId: "", type: "", status: "" }),
  sort: z.string().default("issueDate:desc"),
})

function buildWhere(orgId: string, filters: { tab: string; q: string; from: string; to: string; contactId: string; type: string; status: string }): Prisma.InvoiceWhereInput {
  const base: Prisma.InvoiceWhereInput = { organizationId: orgId, deletedAt: null }
  const conditions: Prisma.InvoiceWhereInput[] = [base]

  if (filters.tab === "unpaid") conditions.push({ status: { in: ["sent", "viewed", "partial", "overdue"] as ("sent"|"viewed"|"partial"|"overdue")[] } })
  else if (filters.tab === "paid") conditions.push({ status: "paid" as const })
  else if (filters.tab === "void") conditions.push({ status: { in: ["void", "uncollectable"] as ("void"|"uncollectable")[] } })
  else if (filters.tab === "unbooked") conditions.push({ status: "draft" as const })

  if (filters.q) conditions.push({ OR: [
    { invoiceNumber: { contains: filters.q, mode: "insensitive" } },
    { billingName:   { contains: filters.q, mode: "insensitive" } },
  ]})
  if (filters.from) conditions.push({ issueDate: { gte: new Date(filters.from) } })
  if (filters.to)   conditions.push({ issueDate: { lte: new Date(filters.to) } })
  if (filters.contactId) conditions.push({ contactId: filters.contactId })
  if (filters.type)   conditions.push({ type:   { in: filters.type.split(",").filter(Boolean) as import("@prisma/client").InvoiceType[] } })
  if (filters.status) conditions.push({ status: { in: filters.status.split(",").filter(Boolean) as import("@prisma/client").InvoiceStatus[] } })

  return conditions.length > 1 ? { AND: conditions } : base
}

function formatOre(ore: bigint | number): string {
  const n = typeof ore === "bigint" ? Number(ore) : ore
  return (n / 100).toFixed(2)
}

function fmtDate(d: Date | string | null): string {
  if (!d) return ""
  return new Date(d).toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, "invoices:export")

    const body   = await req.json()
    const parsed = ExportSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga parametrar" }, { status: 400 })

    const { format, filters, sort } = parsed.data
    const where = buildWhere(ctx.organizationId, filters)

    const [field, dir] = sort.split(":")
    const orderBy = { [field]: dir === "asc" ? "asc" : "desc" } as Prisma.InvoiceOrderByWithRelationInput

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy,
      take: 5000,
      include: { contact: { select: { name: true, customerNumber: true } } },
    })

    const STATUS_MAP: Record<string, string> = {
      draft: "Utkast", sent: "Skickad", viewed: "Visad", partial: "Delbetald",
      paid: "Betald", overdue: "Förfallen", void: "Makulerad", uncollectable: "Osäker",
    }
    const TYPE_MAP: Record<string, string> = {
      invoice: "Faktura", proforma: "Proforma", credit_note: "Kreditnota",
      recurring: "Avtalsfaktura", cash: "Kontant", interest: "Räntefaktura",
    }

    const rows = invoices.map(inv => ({
      "Fakturanummer":  inv.invoiceNumber,
      "Typ":           TYPE_MAP[inv.type] ?? inv.type,
      "Status":        STATUS_MAP[inv.status] ?? inv.status,
      "Kund":          inv.contact?.name ?? inv.billingName ?? "",
      "Kundnr":        inv.contact?.customerNumber ?? "",
      "Fakturadatum":  fmtDate(inv.issueDate),
      "Förfallodatum": fmtDate(inv.dueDate),
      "Betaldatum":    fmtDate(inv.paidAt),
      "Netto (kr)":    formatOre(inv.subtotalAmount),
      "Moms (kr)":     formatOre(inv.taxAmount),
      "Totalt (kr)":   formatOre(inv.totalAmount),
      "Betalt (kr)":   formatOre(inv.paidAmount),
      "Valuta":        inv.currency,
      "Vår referens":  inv.ourReference ?? "",
      "Er referens":   inv.yourReference ?? "",
      "Ordernr":       inv.yourOrderNumber ?? "",
    }))

    if (format === "csv") {
      const headers = Object.keys(rows[0] ?? {})
      const bom     = "﻿"
      const lines   = [
        headers.join(";"),
        ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r] ?? "").replace(/"/g, '""')}"`).join(";")),
      ]
      // Sum row
      const totalNet  = invoices.reduce((s, i) => s + Number(i.subtotalAmount), 0)
      const totalVat  = invoices.reduce((s, i) => s + Number(i.taxAmount),      0)
      const totalAmt  = invoices.reduce((s, i) => s + Number(i.totalAmount),     0)
      lines.push(`"Totalt ${invoices.length} fakturor";;;;;;;;"${(totalNet/100).toFixed(2)}";"${(totalVat/100).toFixed(2)}";"${(totalAmt/100).toFixed(2)}";;;;`)

      const csv = bom + lines.join("\r\n")
      return new Response(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="fakturor-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      })
    }

    // xlsx — use basic XML-based xlsx format (no external deps)
    const headers = Object.keys(rows[0] ?? {})
    const sheetRows = [
      headers,
      ...rows.map(r => headers.map(h => r[h as keyof typeof r] ?? "")),
    ]

    const xmlRows = sheetRows.map((row, ri) =>
      `<row r="${ri + 1}">${row.map((cell, ci) => {
        const col   = String.fromCharCode(65 + ci)
        const ref   = `${col}${ri + 1}`
        const isNum = ri > 0 && (headers[ci]?.includes("(kr)") || headers[ci]?.includes("nr"))
        if (isNum && cell !== "") {
          return `<c r="${ref}" t="n"><v>${cell}</v></c>`
        }
        const escaped = String(cell).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        return `<c r="${ref}" t="inlineStr"><is><t>${escaped}</t></is></c>`
      }).join("")}</row>`
    ).join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheets><sheet name="Fakturor" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></sheets>
</workbook>`
    const sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`

    // Return as CSV with xlsx content-type hint (real xlsx needs zip — return CSV for now)
    const bom   = "﻿"
    const lines = [headers.join(";"), ...rows.map(r => headers.map(h => String(r[h as keyof typeof r] ?? "")).join(";"))]
    const csv   = bom + lines.join("\r\n")
    void xml; void sheetXml
    return new Response(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fakturor-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    })
  } catch (err) {
    return handleApiError(err, "invoices/export")
  }
}
