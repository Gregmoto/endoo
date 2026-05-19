import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"

const ExportSchema = z.object({
  format:  z.enum(["csv", "xlsx", "pdf"]),
  filters: z.record(z.string(), z.unknown()).optional(),
})

function fmtKr(ore: bigint | number): string {
  return (Number(ore) / 100).toFixed(2).replace(".", ",")
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:export")

    const body   = await req.json()
    const parsed = ExportSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    if (parsed.data.format !== "csv") {
      return Response.json({ error: "Formatet stöds inte ännu" }, { status: 501 })
    }

    const products = await prisma.product.findMany({
      where: { organizationId: ctx.organizationId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        sku: true, name: true, type: true, unitPrice: true, purchasePrice: true,
        stockQuantity: true, reservedQuantity: true, availableQuantity: true,
        inventoryValue: true, vatType: true, salesAccount: true, isActive: true,
      },
    })

    const header = ["Artikelnr", "Namn", "Typ", "Pris (kr)", "Inköpspris (kr)", "Lager", "Reserverat", "Disponibelt", "Lagervärde (kr)", "Momstyp", "Konto", "Aktiv"]
    const rows = products.map(p => [
      p.sku ?? "",
      p.name,
      p.type === "product" ? "Produkt" : "Tjänst",
      fmtKr(p.unitPrice),
      p.purchasePrice != null ? fmtKr(p.purchasePrice) : "",
      p.stockQuantity.toString(),
      p.reservedQuantity.toString(),
      p.availableQuantity.toString(),
      fmtKr(p.inventoryValue),
      p.vatType ?? "",
      p.salesAccount ?? "",
      p.isActive ? "Ja" : "Nej",
    ])

    const BOM = "﻿"
    const csv = BOM + [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n")

    return new Response(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="artiklar-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    return handleApiError(err, "articles/export")
  }
}
