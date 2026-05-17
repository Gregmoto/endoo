/**
 * Agency accountant mode — client snapshot computation.
 *
 * computeClientSnapshot  – computes health metrics for one client org and upserts a ClientSnapshot row.
 * computeAllSnapshots    – runs computeClientSnapshot for every active client of an agency.
 */

import { prisma } from "@/lib/prisma"

// ─── Local types ─────────────────────────────────────────────────────────────

interface OnboardingChecks {
  hasChartOfAccounts: boolean // account count >= 10
  hasFiscalYear: boolean // any open fiscal year
  hasOrgInfo: boolean // org.orgNumber != null
  hasFirstInvoice: boolean // any invoice exists
  hasVatConfig: boolean // any VatPeriod exists
  hasBankDetails: boolean // org.bankgiro OR org.iban != null
}

interface Alert {
  type: string
  severity: "error" | "warning" | "info"
  message: string
  count?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the number of whole days between now and a future date (negative = past). */
function daysUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / 86_400_000)
}

/** Returns the number of whole days since a past date. */
function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── Core computation ─────────────────────────────────────────────────────────

export async function computeClientSnapshot(
  agencyId: string,
  clientId: string,
): Promise<void> {
  const now = new Date()

  // ── Fetch org ──────────────────────────────────────────────────────────────
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: clientId },
    select: {
      name: true,
      slug: true,
      orgNumber: true,
      bankgiro: true,
      iban: true,
    },
  })

  // ── Overdue invoices ───────────────────────────────────────────────────────
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: clientId,
      status: { in: ["sent", "viewed", "partial"] },
      dueDate: { lt: now },
      deletedAt: null,
    },
    select: { totalAmount: true },
  })

  const overdueInvoiceCount = overdueInvoices.length
  const overdueAmountOre = overdueInvoices.reduce<bigint>(
    (acc, inv) => acc + inv.totalAmount,
    0n,
  )

  // ── Unbooked supplier invoices ─────────────────────────────────────────────
  const unbookedSupplierCount = await prisma.supplierInvoice.count({
    where: {
      organizationId: clientId,
      status: { in: ["needs_review", "approved"] },
    },
  })

  // ── AI anomalies / suggestions ─────────────────────────────────────────────
  const openAiAnomalyCount = await prisma.aiAnomaly.count({
    where: {
      organizationId: clientId,
      status: "open",
    },
  })

  const pendingAiSuggestionCount = await prisma.aiSuggestion.count({
    where: {
      organizationId: clientId,
      status: "pending",
    },
  })

  // ── Last activity (most recent journal entry) ──────────────────────────────
  const lastJournal = await prisma.journal.findFirst({
    where: { organizationId: clientId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  const daysSinceLastActivity: number | null = lastJournal
    ? daysSince(lastJournal.createdAt)
    : null

  // ── VAT deadline ───────────────────────────────────────────────────────────
  const nextVatPeriod = await prisma.vatPeriod.findFirst({
    where: {
      organizationId: clientId,
      status: "open",
    },
    orderBy: { periodEnd: "asc" },
    select: { periodEnd: true },
  })

  const nextVatDeadlineAt: Date | null = nextVatPeriod?.periodEnd ?? null
  const vatDeadlineDaysLeft: number | null = nextVatDeadlineAt
    ? daysUntil(nextVatDeadlineAt)
    : null

  // ── Fiscal year ────────────────────────────────────────────────────────────
  const latestFiscalYear = await prisma.fiscalYear.findFirst({
    where: {
      organizationId: clientId,
      status: "open",
    },
    orderBy: { endDate: "desc" },
    select: { endDate: true },
  })

  const fiscalYearEndsAt: Date | null = latestFiscalYear?.endDate ?? null
  const fiscalYearDaysLeft: number | null = fiscalYearEndsAt
    ? daysUntil(fiscalYearEndsAt)
    : null

  // ── Task counts ────────────────────────────────────────────────────────────
  const [openTaskCount, overdueTaskCount] = await Promise.all([
    prisma.task.count({
      where: {
        organizationId: clientId,
        deletedAt: null,
        status: { notIn: ["done", "cancelled"] },
      },
    }),
    prisma.task.count({
      where: {
        organizationId: clientId,
        deletedAt: null,
        status: { notIn: ["done", "cancelled"] },
        dueDate: { lt: now },
      },
    }),
  ])

  // ── Onboarding checks ──────────────────────────────────────────────────────
  const [accountCount, hasFiscalYearOpen, invoiceCount, vatPeriodCount] =
    await Promise.all([
      prisma.account.count({
        where: { organizationId: clientId, isActive: true },
      }),
      prisma.fiscalYear.count({
        where: { organizationId: clientId, status: "open" },
      }),
      prisma.invoice.count({
        where: { organizationId: clientId, deletedAt: null },
      }),
      prisma.vatPeriod.count({
        where: { organizationId: clientId },
      }),
    ])

  const onboarding: OnboardingChecks = {
    hasChartOfAccounts: accountCount >= 10,
    hasFiscalYear: hasFiscalYearOpen > 0,
    hasOrgInfo: org.orgNumber != null,
    hasFirstInvoice: invoiceCount > 0,
    hasVatConfig: vatPeriodCount > 0,
    hasBankDetails: org.bankgiro != null || org.iban != null,
  }

  const onboardingDone = Object.values(onboarding).every(Boolean)

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts: Alert[] = []

  if (overdueInvoiceCount > 0) {
    const amountKr = Math.round(Number(overdueAmountOre) / 100)
    alerts.push({
      type: "overdue_invoice",
      severity: "error",
      message: `${overdueInvoiceCount} förfallna fakturor (${amountKr.toLocaleString("sv-SE")} kr)`,
      count: overdueInvoiceCount,
    })
  }

  if (unbookedSupplierCount > 0) {
    alerts.push({
      type: "unbooked_supplier",
      severity: "warning",
      message: `${unbookedSupplierCount} lev.fakturor väntar på bokning`,
      count: unbookedSupplierCount,
    })
  }

  if (vatDeadlineDaysLeft != null) {
    if (vatDeadlineDaysLeft <= 14) {
      alerts.push({
        type: "vat_deadline",
        severity: "error",
        message: `Moms förfaller om ${vatDeadlineDaysLeft} dagar`,
        count: vatDeadlineDaysLeft,
      })
    } else if (vatDeadlineDaysLeft <= 30) {
      alerts.push({
        type: "vat_deadline",
        severity: "warning",
        message: `Moms förfaller om ${vatDeadlineDaysLeft} dagar`,
        count: vatDeadlineDaysLeft,
      })
    }
  }

  if (fiscalYearDaysLeft != null) {
    if (fiscalYearDaysLeft <= 30) {
      alerts.push({
        type: "fiscal_year_ending",
        severity: "error",
        message: `Räkenskapsåret avslutas om ${fiscalYearDaysLeft} dagar`,
        count: fiscalYearDaysLeft,
      })
    } else if (fiscalYearDaysLeft <= 60) {
      alerts.push({
        type: "fiscal_year_ending",
        severity: "warning",
        message: `Räkenskapsåret avslutas om ${fiscalYearDaysLeft} dagar`,
        count: fiscalYearDaysLeft,
      })
    }
  }

  if (openAiAnomalyCount > 0) {
    alerts.push({
      type: "ai_anomaly",
      severity: "warning",
      message: `${openAiAnomalyCount} AI-varningar att granska`,
      count: openAiAnomalyCount,
    })
  }

  if (daysSinceLastActivity != null && daysSinceLastActivity > 21) {
    alerts.push({
      type: "no_activity",
      severity: "warning",
      message: `Ingen aktivitet på ${daysSinceLastActivity} dagar`,
      count: daysSinceLastActivity,
    })
  }

  if (overdueTaskCount > 0) {
    alerts.push({
      type: "overdue_tasks",
      severity: "warning",
      message: `${overdueTaskCount} försenad${overdueTaskCount !== 1 ? "e" : ""} uppgift${overdueTaskCount !== 1 ? "er" : ""}`,
      count: overdueTaskCount,
    })
  }

  if (!onboarding.hasChartOfAccounts || !onboarding.hasFiscalYear) {
    alerts.push({
      type: "onboarding_incomplete",
      severity: "info",
      message: "Onboarding ej klar",
    })
  }

  // ── Health score ───────────────────────────────────────────────────────────
  let score = 100

  score -= clamp(overdueInvoiceCount * 5, 0, 25)
  score -= clamp(unbookedSupplierCount * 8, 0, 24)
  score -= clamp(openAiAnomalyCount * 6, 0, 18)

  if (vatDeadlineDaysLeft != null) {
    if (vatDeadlineDaysLeft <= 7) {
      score -= 10
    } else if (vatDeadlineDaysLeft <= 14) {
      score -= 5
    }
  }

  if (daysSinceLastActivity != null) {
    if (daysSinceLastActivity > 30) {
      score -= 15
    } else if (daysSinceLastActivity > 14) {
      score -= 7
    }
  }

  if (!onboardingDone) {
    score -= 8
  }

  score -= clamp(overdueTaskCount * 3, 0, 12)

  const healthScore = clamp(score, 0, 100)

  // ── Upsert ClientSnapshot ──────────────────────────────────────────────────
  const sharedData = {
    clientName: org.name,
    clientSlug: org.slug,
    healthScore,
    overdueInvoiceCount,
    overdueAmountOre,
    unbookedSupplierCount,
    openAiAnomalyCount,
    pendingAiSuggestionCount,
    openTaskCount,
    overdueTaskCount,
    daysSinceLastActivity,
    nextVatDeadlineAt,
    vatDeadlineDaysLeft,
    fiscalYearEndsAt,
    fiscalYearDaysLeft,
    onboardingChecks: onboarding as unknown as import("@prisma/client").Prisma.InputJsonValue,
    alerts: alerts as unknown as import("@prisma/client").Prisma.InputJsonValue,
    computedAt: new Date(),
  }

  await prisma.clientSnapshot.upsert({
    where: { agencyId_clientId: { agencyId, clientId } },
    create: {
      agencyId,
      clientId,
      ...sharedData,
    },
    update: sharedData,
  })
}

// ─── Bulk computation ─────────────────────────────────────────────────────────

export async function computeAllSnapshots(agencyId: string): Promise<void> {
  const relationships = await prisma.agencyClientRelationship.findMany({
    where: {
      agencyId,
      status: "active",
    },
    select: { clientId: true },
  })

  for (const rel of relationships) {
    await computeClientSnapshot(agencyId, rel.clientId)
  }
}
