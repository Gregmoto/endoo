/**
 * Full re-index for an organization.
 * Called by the nightly cron at /api/cron/reindex-search.
 * Also callable ad-hoc from admin tools.
 *
 * Strategy: delete-all-then-insert (not upsert) so stale entries
 * for deleted entities are cleaned up automatically.
 */
import { prisma } from "@/lib/prisma"
import {
  indexContact,
  indexInvoice,
  indexSupplierInvoice,
  indexProduct,
  indexJournal,
  indexMember,
} from "./index-entity"

export async function reindexOrg(organizationId: string): Promise<{ indexed: number }> {
  // Delete stale index for this org first
  await prisma.searchIndex.deleteMany({ where: { organizationId } })

  let indexed = 0

  // ── Contacts ──────────────────────────────────────────────────────────────
  const contacts = await prisma.contact.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true, name: true, email: true, phone: true,
      orgNumber: true, vatNumber: true, customerNumber: true,
      city: true, status: true,
    },
  })
  for (const c of contacts) { indexContact(organizationId, c); indexed++ }

  // ── Invoices ──────────────────────────────────────────────────────────────
  const invoices = await prisma.invoice.findMany({
    where:  { organizationId, deletedAt: null },
    select: {
      id: true, invoiceNumber: true, status: true,
      billingName: true, reference: true, poNumber: true,
      totalAmount: true, currency: true, dueDate: true,
    },
  })
  for (const inv of invoices) { indexInvoice(organizationId, inv); indexed++ }

  // ── Supplier Invoices ─────────────────────────────────────────────────────
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where:  { organizationId },
    select: {
      id: true, status: true, supplierName: true, invoiceNumber: true,
      ocrNumber: true, amountInclVat: true, currency: true, fileName: true,
    },
  })
  for (const si of supplierInvoices) { indexSupplierInvoice(organizationId, si); indexed++ }

  // ── Products ──────────────────────────────────────────────────────────────
  const products = await prisma.product.findMany({
    where:  { organizationId, deletedAt: null },
    select: {
      id: true, name: true, sku: true, description: true,
      category: true, isActive: true, unitPrice: true, currency: true,
    },
  })
  for (const p of products) { indexProduct(organizationId, p); indexed++ }

  // ── Journals ──────────────────────────────────────────────────────────────
  const journals = await prisma.journal.findMany({
    where:  { organizationId },
    select: { id: true, reference: true, description: true, status: true, date: true },
  })
  for (const j of journals) { indexJournal(organizationId, j); indexed++ }

  // ── Members ───────────────────────────────────────────────────────────────
  const members = await prisma.organizationMember.findMany({
    where:   { organizationId, deletedAt: null },
    select: {
      id: true, role: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  })
  for (const m of members) {
    if (m.user) { indexMember(organizationId, m, m.user); indexed++ }
  }

  return { indexed }
}

export async function reindexAllOrgs(): Promise<{ orgs: number; indexed: number }> {
  const orgs = await prisma.organization.findMany({
    where:  { isActive: true },
    select: { id: true },
  })

  let totalIndexed = 0
  for (const org of orgs) {
    const { indexed } = await reindexOrg(org.id)
    totalIndexed += indexed
  }

  return { orgs: orgs.length, indexed: totalIndexed }
}
