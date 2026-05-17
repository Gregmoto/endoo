/**
 * Search index writer.
 * All functions are fire-and-forget — callers do NOT await them.
 * The nightly re-index cron is the safety net for any missed writes.
 */
import { prisma } from "@/lib/prisma"
import type { IndexEntityInput, SearchEntityType } from "./types"

// ─── Core upsert ─────────────────────────────────────────────────────────────

export function indexEntity(organizationId: string, input: IndexEntityInput): void {
  prisma.searchIndex.upsert({
    where: {
      organizationId_entityType_entityId: {
        organizationId,
        entityType: input.entityType,
        entityId:   input.entityId,
      },
    },
    create: {
      organizationId,
      entityType: input.entityType,
      entityId:   input.entityId,
      title:      input.title,
      subtitle:   input.subtitle ?? null,
      keywords:   input.keywords,
      url:        input.url,
      metadata:   (input.metadata ?? {}) as never,
    },
    update: {
      title:    input.title,
      subtitle: input.subtitle ?? null,
      keywords: input.keywords,
      url:      input.url,
      metadata: (input.metadata ?? {}) as never,
    },
  }).catch(err => console.error("[search-index] upsert failed", err))
}

export function removeFromIndex(
  organizationId: string,
  entityType: SearchEntityType,
  entityId: string,
): void {
  prisma.searchIndex.deleteMany({
    where: { organizationId, entityType, entityId },
  }).catch(err => console.error("[search-index] delete failed", err))
}

// ─── Entity-specific helpers ──────────────────────────────────────────────────

export function indexContact(
  orgId: string,
  c: {
    id: string; name: string; email?: string | null; phone?: string | null
    orgNumber?: string | null; vatNumber?: string | null; customerNumber?: string | null
    city?: string | null; status: string
  },
) {
  indexEntity(orgId, {
    entityType: "contact",
    entityId:   c.id,
    title:      c.name,
    subtitle:   [c.email, c.customerNumber].filter(Boolean).join(" · ") || null,
    keywords:   [c.name, c.email, c.phone, c.orgNumber, c.vatNumber, c.customerNumber, c.city]
                  .filter(Boolean).join(" "),
    url:        `/contacts/${c.id}`,
    metadata:   { status: c.status },
  })
}

export function indexInvoice(
  orgId: string,
  inv: {
    id: string; invoiceNumber: string; status: string
    billingName?: string | null; reference?: string | null; poNumber?: string | null
    totalAmount: bigint | number; currency: string; dueDate: Date | string
  },
) {
  const total = typeof inv.totalAmount === "bigint"
    ? Number(inv.totalAmount) / 100
    : inv.totalAmount / 100

  indexEntity(orgId, {
    entityType: "invoice",
    entityId:   inv.id,
    title:      `Faktura ${inv.invoiceNumber}`,
    subtitle:   [inv.billingName, `${total.toLocaleString("sv-SE")} ${inv.currency}`].filter(Boolean).join(" · "),
    keywords:   [inv.invoiceNumber, inv.billingName, inv.reference, inv.poNumber]
                  .filter(Boolean).join(" "),
    url:        `/invoices/${inv.id}`,
    metadata:   { status: inv.status, invoiceNumber: inv.invoiceNumber },
  })
}

export function indexSupplierInvoice(
  orgId: string,
  inv: {
    id: string; status: string
    supplierName?: string | null; invoiceNumber?: string | null
    ocrNumber?: string | null; amountInclVat?: bigint | number | null; currency: string
    fileName: string
  },
) {
  const amount = inv.amountInclVat != null
    ? (typeof inv.amountInclVat === "bigint" ? Number(inv.amountInclVat) : inv.amountInclVat) / 100
    : null

  indexEntity(orgId, {
    entityType: "supplier_invoice",
    entityId:   inv.id,
    title:      inv.supplierName ?? inv.fileName,
    subtitle:   [inv.invoiceNumber, amount != null ? `${amount.toLocaleString("sv-SE")} ${inv.currency}` : null]
                  .filter(Boolean).join(" · ") || null,
    keywords:   [inv.supplierName, inv.invoiceNumber, inv.ocrNumber, inv.fileName]
                  .filter(Boolean).join(" "),
    url:        `/supplier-invoices/${inv.id}`,
    metadata:   { status: inv.status },
  })
}

export function indexProduct(
  orgId: string,
  p: {
    id: string; name: string; sku?: string | null; description?: string | null
    category?: string | null; isActive: boolean; unitPrice: bigint | number; currency: string
  },
) {
  const price = typeof p.unitPrice === "bigint" ? Number(p.unitPrice) : p.unitPrice

  indexEntity(orgId, {
    entityType: "product",
    entityId:   p.id,
    title:      p.name,
    subtitle:   [p.sku, p.category].filter(Boolean).join(" · ") || null,
    keywords:   [p.name, p.sku, p.description, p.category].filter(Boolean).join(" "),
    url:        `/products/${p.id}`,
    metadata:   { isActive: p.isActive, unitPrice: price, currency: p.currency },
  })
}

export function indexJournal(
  orgId: string,
  j: {
    id: string; reference: string; description: string; status: string; date: Date | string
  },
) {
  indexEntity(orgId, {
    entityType: "journal",
    entityId:   j.id,
    title:      j.reference,
    subtitle:   j.description.slice(0, 80) || null,
    keywords:   [j.reference, j.description].filter(Boolean).join(" "),
    url:        `/journals/${j.id}`,
    metadata:   { status: j.status },
  })
}

export function indexMember(
  orgId: string,
  member: { id: string; role: string },
  user:   { id: string; fullName: string; email: string },
) {
  indexEntity(orgId, {
    entityType: "member",
    entityId:   user.id,
    title:      user.fullName,
    subtitle:   user.email,
    keywords:   [user.fullName, user.email].join(" "),
    url:        `/team`,
    metadata:   { role: member.role, memberId: member.id },
  })
}
