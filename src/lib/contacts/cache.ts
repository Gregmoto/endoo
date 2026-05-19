import { prisma } from "@/lib/prisma"

/**
 * Refreshes the denormalized cache fields on a Contact:
 *   lastInvoiceDate, totalRevenueOre, openInvoicesCount, openInvoicesAmount
 *
 * Call this after any Invoice create/update/void/payment change.
 * Safe to call multiple times (idempotent).
 */
export async function refreshContactCache(contactId: string): Promise<void> {
  const OPEN_STATUSES = ["sent", "viewed", "partial", "overdue"] as const

  const [allInvoices, openInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { contactId, deletedAt: null, status: { not: "void" } },
      select: { totalAmount: true, issueDate: true },
      orderBy: { issueDate: "desc" },
    }),
    prisma.invoice.findMany({
      where: { contactId, deletedAt: null, status: { in: [...OPEN_STATUSES] } },
      select: { totalAmount: true, paidAmount: true },
    }),
  ])

  const totalRevenueOre    = allInvoices.reduce((s, i) => s + i.totalAmount, BigInt(0))
  const lastInvoiceDate    = allInvoices[0]?.issueDate ?? null
  const openInvoicesCount  = openInvoices.length
  const openInvoicesAmount = openInvoices.reduce(
    (s, i) => s + (i.totalAmount - i.paidAmount),
    BigInt(0),
  )

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      lastInvoiceDate,
      totalRevenueOre,
      openInvoicesCount,
      openInvoicesAmount,
    },
  })
}

/**
 * Refreshes cache for all contacts in an org.
 * Used by the nightly cron and post-migration backfill.
 */
export async function refreshAllContactCaches(organizationId: string): Promise<number> {
  const contacts = await prisma.contact.findMany({
    where:  { organizationId, deletedAt: null },
    select: { id: true },
  })

  await Promise.all(contacts.map(c => refreshContactCache(c.id).catch(() => {})))
  return contacts.length
}
