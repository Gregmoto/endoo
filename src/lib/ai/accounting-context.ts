import { prisma } from "@/lib/prisma"
import type { AccountingAiContext, AccountInfo, VendorHistory } from "./types"

export async function buildAccountingContext(
  organizationId: string,
  opts?: {
    vendorName?:    string
    vendorOrgNr?:   string
    amountOre?:     number
    description?:   string
  }
): Promise<AccountingAiContext> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, orgNumber: true, vatNumber: true },
  })

  const rawAccounts = await prisma.account.findMany({
    where:   { organizationId, isActive: true },
    orderBy: { number: "asc" },
    select:  { number: true, name: true, type: true },
  })

  const accounts: AccountInfo[] = rawAccounts.map(a => ({
    number: a.number,
    name:   a.name,
    type:   a.type,
  }))

  // Recent journal descriptions for pattern context
  const recentJournals = await prisma.journal.findMany({
    where:   { organizationId, status: "posted" },
    orderBy: { date: "desc" },
    take:    20,
    select:  { description: true },
  })
  const recentPatterns = recentJournals.map(j => j.description)

  // Vendor history
  let vendorHistory: VendorHistory | null = null
  if (opts?.vendorName) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        organizationId,
        OR: [
          { name:      { contains: opts.vendorName, mode: "insensitive" } },
          { orgNumber: opts.vendorOrgNr ?? undefined },
        ],
      },
      select: { id: true, name: true },
    })

    if (supplier) {
      const supplierInvoices = await prisma.supplierInvoice.findMany({
        where:   { organizationId, supplierId: supplier.id, status: "booked" },
        orderBy: { invoiceDate: "desc" },
        take:    15,
        select:  { amountInclVat: true, invoiceDate: true, journalId: true },
      })

      const amounts = supplierInvoices
        .map(i => Number(i.amountInclVat))
        .filter(Boolean)

      const avg = amounts.length
        ? Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length)
        : 0

      // Find accounts most used in journals linked to this vendor's invoices
      const journalIds = supplierInvoices
        .map(i => i.journalId)
        .filter(Boolean) as string[]

      let usualAccounts: string[] = []
      if (journalIds.length) {
        const entries = await prisma.journalEntry.findMany({
          where:   { organizationId, journalId: { in: journalIds } },
          select:  { account: { select: { number: true } } },
        })
        const freq: Record<string, number> = {}
        for (const e of entries) {
          freq[e.account.number] = (freq[e.account.number] ?? 0) + 1
        }
        usualAccounts = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([num]) => num)
      }

      const lastDate = supplierInvoices[0]?.invoiceDate
      vendorHistory = {
        vendorName:      supplier.name,
        invoiceCount:    supplierInvoices.length,
        avgAmountOre:    avg,
        usualAccounts,
        lastInvoiceDate: lastDate ? lastDate.toISOString().slice(0, 10) : null,
      }
    }
  }

  return {
    orgName:       org?.name       ?? "Organisation",
    orgNumber:     org?.orgNumber  ?? null,
    vatNumber:     org?.vatNumber  ?? null,
    accounts,
    vendorHistory,
    recentPatterns,
  }
}

export function formatContextForPrompt(ctx: AccountingAiContext): string {
  const lines: string[] = []

  lines.push(`Organisation: ${ctx.orgName}`)
  if (ctx.orgNumber) lines.push(`Org.nr: ${ctx.orgNumber}`)
  if (ctx.vatNumber) lines.push(`Moms-nr: ${ctx.vatNumber}`)

  lines.push("\n=== KONTOPLAN (aktiva konton) ===")
  const grouped = groupAccountsByClass(ctx.accounts)
  for (const [cls, accs] of Object.entries(grouped)) {
    lines.push(`\n${cls}:`)
    for (const a of accs) {
      lines.push(`  ${a.number} ${a.name}`)
    }
  }

  if (ctx.vendorHistory) {
    const v = ctx.vendorHistory
    lines.push(`\n=== LEVERANTÖRSHISTORIK: ${v.vendorName} ===`)
    lines.push(`Antal bokade fakturor: ${v.invoiceCount}`)
    if (v.avgAmountOre) {
      lines.push(`Genomsnittligt fakturabelopp: ${(v.avgAmountOre / 100).toLocaleString("sv-SE")} kr`)
    }
    if (v.usualAccounts.length) {
      lines.push(`Vanligaste konton för denna leverantör: ${v.usualAccounts.join(", ")}`)
    }
    if (v.lastInvoiceDate) {
      lines.push(`Senaste faktura: ${v.lastInvoiceDate}`)
    }
  }

  if (ctx.recentPatterns.length) {
    lines.push(`\n=== SENASTE VERIFIKATBESKRIVNINGAR (mönster) ===`)
    lines.push(ctx.recentPatterns.slice(0, 10).join("\n"))
  }

  return lines.join("\n")
}

function groupAccountsByClass(accounts: AccountInfo[]): Record<string, AccountInfo[]> {
  const groups: Record<string, AccountInfo[]> = {
    "1xxx (Tillgångar)":   [],
    "2xxx (Skulder/Eget)": [],
    "3xxx (Intäkter)":     [],
    "4xxx (Inköp)":        [],
    "5-6xxx (Kostnader)":  [],
    "7-8xxx (Övrigt)":     [],
  }
  for (const a of accounts) {
    const d = a.number[0]
    if (d === "1")                          groups["1xxx (Tillgångar)"].push(a)
    else if (d === "2")                     groups["2xxx (Skulder/Eget)"].push(a)
    else if (d === "3")                     groups["3xxx (Intäkter)"].push(a)
    else if (d === "4")                     groups["4xxx (Inköp)"].push(a)
    else if (d === "5" || d === "6")        groups["5-6xxx (Kostnader)"].push(a)
    else                                    groups["7-8xxx (Övrigt)"].push(a)
  }
  return Object.fromEntries(
    Object.entries(groups).filter(([, v]) => v.length > 0)
  )
}
