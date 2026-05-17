import { prisma } from "@/lib/prisma"
import { getPeriodBalances } from "@/services/reports/engine"
import { getVatReport } from "@/services/reports/vat-report"

const intents = {
  trialBalance:    /provbalans|stämmer|obalans|balansera|fel\s+i/i,
  incomeStatement: /resultat|vinst|förlust|omsättn|intäkt|kostnad/i,
  balanceSheet:    /tillgång|skuld|balansräkning|eget\s+kapital/i,
  vat:             /moms|deklaration|ruta\s+\d+|box\s+\d+|ingående moms|utgående moms/i,
  journal:         /verifikat|bokför|konter|journal|post/i,
  account:         /konto\s+\d{4}|\d{4}\s+[a-z]/i,
  invoice:         /faktura|kundfordran|kund/i,
  supplier:        /leverantör|lev\.?fakt|2440/i,
}

function fmtOre(ore: bigint): string {
  return (
    new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(
      Number(ore) / 100
    ) + " kr"
  )
}

function accountTypeSwedish(type: string): string {
  switch (type) {
    case "asset":     return "tillgång"
    case "liability": return "skuld"
    case "equity":    return "eget kapital"
    case "income":    return "intäkt"
    case "expense":   return "kostnad"
    default:          return type
  }
}

export async function buildAiContext(
  organizationId: string,
  userMessage: string
): Promise<string> {
  const sections: string[] = []

  // ── Organisation ──────────────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, orgNumber: true, vatNumber: true },
  })

  const fiscalYear = await prisma.fiscalYear.findFirst({
    where: { organizationId, status: { in: ["open"] } },
    orderBy: { startDate: "desc" },
  })

  const today = new Date()
  const todayStr = today.toLocaleDateString("sv-SE")
  const startDate = fiscalYear
    ? fiscalYear.startDate.toLocaleDateString("sv-SE")
    : new Date(today.getFullYear(), 0, 1).toLocaleDateString("sv-SE")
  const endDate = fiscalYear
    ? fiscalYear.endDate.toLocaleDateString("sv-SE")
    : new Date(today.getFullYear(), 11, 31).toLocaleDateString("sv-SE")

  const fyName = fiscalYear?.name ?? String(today.getFullYear())

  sections.push(
    `=== ORGANISATION ===
Namn: ${org?.name ?? "okänd"}
Organisationsnummer: ${org?.orgNumber ?? "ej angivet"}
Momsregistrering: ${org?.vatNumber ?? "ej angivet"}
Räkenskapsår: ${fyName} (${startDate} – ${endDate})
Dagens datum: ${todayStr}`
  )

  // ── Chart of accounts (always included) ───────────────────────────────────
  const accounts = await prisma.account.findMany({
    where: { organizationId, isActive: true },
    orderBy: { number: "asc" },
    select: { number: true, name: true, type: true },
  })

  const accountLines = accounts.map(
    (a) => `${a.number} ${a.name} (${accountTypeSwedish(a.type)})`
  )
  sections.push(`=== KONTOPLAN (aktiva konton) ===\n${accountLines.join("\n")}`)

  // ── Detect intents ─────────────────────────────────────────────────────────
  const hasTrialBalance    = intents.trialBalance.test(userMessage)
  const hasIncomeStatement = intents.incomeStatement.test(userMessage)
  const hasBalanceSheet    = intents.balanceSheet.test(userMessage)
  const hasVat             = intents.vat.test(userMessage)
  const hasJournal         = intents.journal.test(userMessage)
  const hasInvoice         = intents.invoice.test(userMessage)
  const hasSupplier        = intents.supplier.test(userMessage)

  // ── Trial balance ─────────────────────────────────────────────────────────
  if (hasTrialBalance || hasIncomeStatement || hasBalanceSheet) {
    const fyStart = fiscalYear
      ? fiscalYear.startDate.toISOString().slice(0, 10)
      : `${today.getFullYear()}-01-01`
    const fyEnd = today.toISOString().slice(0, 10)

    const balances = await getPeriodBalances({
      organizationId,
      fromDate: fyStart,
      toDate:   fyEnd,
    })

    let totalDebit  = 0n
    let totalCredit = 0n
    const rows = balances.map((b) => {
      totalDebit  += b.debit
      totalCredit += b.credit
      return `${b.number.padEnd(6)} | ${fmtOre(b.debit).padStart(14)} | ${fmtOre(b.credit).padStart(14)} | ${fmtOre(b.net).padStart(14)}`
    })

    const balanced = totalDebit === totalCredit ? "Ja" : "Nej"
    sections.push(
      `=== PROVBALANS (innevarande räkenskapsår) ===
Konto  | Debet          | Kredit         | Netto
${rows.join("\n")}
Total debet: ${fmtOre(totalDebit)} | Total kredit: ${fmtOre(totalCredit)} | Balanserad: ${balanced}`
    )
  }

  // ── VAT summary ───────────────────────────────────────────────────────────
  if (hasVat) {
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(today.getMonth() - 3)
    const vatFromDate = threeMonthsAgo.toISOString().slice(0, 10)
    const vatToDate   = today.toISOString().slice(0, 10)

    const vatReport = await getVatReport({
      organizationId,
      fromDate: vatFromDate,
      toDate:   vatToDate,
    })

    sections.push(
      `=== MOMSSTATUS (senaste 3 månader) ===
Ruta 10 Utgående moms 25%: ${fmtOre(vatReport.box10)}
Ruta 11 Utgående moms 12%: ${fmtOre(vatReport.box11)}
Ruta 12 Utgående moms 6%:  ${fmtOre(vatReport.box12)}
Ruta 48 Ingående moms:     ${fmtOre(vatReport.box48)}
Ruta 49 Att betala:        ${fmtOre(vatReport.box49)}`
    )
  }

  // ── Recent journals ───────────────────────────────────────────────────────
  if (hasJournal) {
    const journals = await prisma.journal.findMany({
      where: { organizationId, status: "posted" },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        entries: {
          include: {
            account: { select: { number: true, name: true } },
          },
        },
      },
    })

    const journalLines = journals.map((j) => {
      const entryLines = j.entries.map((e) => {
        if (e.debit > 0n) {
          return `  DR ${e.account.number} ${e.account.name} ${fmtOre(e.debit)}`
        } else {
          return `  CR ${e.account.number} ${e.account.name} ${fmtOre(e.credit)}`
        }
      })
      return `${j.reference} | ${j.date.toLocaleDateString("sv-SE")} | ${j.description}\n${entryLines.join("\n")}`
    })

    sections.push(`=== SENASTE VERIFIKATIONER ===\n${journalLines.join("\n\n")}`)
  }

  // ── Open invoices ─────────────────────────────────────────────────────────
  if (hasInvoice) {
    const openInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["sent", "viewed", "partial", "overdue"] },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: {
        invoiceNumber: true,
        totalAmount:   true,
        dueDate:       true,
        contact:       { select: { name: true } },
      },
    })

    const invoiceLines = openInvoices.map(
      (inv) =>
        `${inv.invoiceNumber} | ${inv.contact?.name ?? "okänd"} | ${fmtOre(inv.totalAmount)} | Förfaller ${inv.dueDate?.toLocaleDateString("sv-SE") ?? "ej angivet"}`
    )
    sections.push(`=== ÖPPNA FAKTUROR ===\n${invoiceLines.join("\n")}`)
  }

  // ── Open supplier invoices ────────────────────────────────────────────────
  if (hasSupplier) {
    const supplierCounts = await prisma.supplierInvoice.groupBy({
      by: ["status"],
      where: {
        organizationId,
        status: { in: ["needs_review", "approved"] },
      },
      _count: { id: true },
    })

    const counts = supplierCounts
      .map((s) => `${s.status} (${s._count.id} st)`)
      .join(" | ")

    sections.push(`=== ÖPPNA LEVERANTÖRSFAKTUROR ===\nStatus: ${counts || "inga öppna"}`)
  }

  return sections.join("\n\n")
}
