/**
 * Email template renderer.
 * Each template receives the job payload and a user email address,
 * and returns { subject, html }.
 * No DB calls allowed here — all data must be in the payload.
 */

import type { NotificationTemplate } from "@prisma/client"
import { emailShell, h1, p, factRow, factsTable, ctaButton, alertBox } from "./shell"

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.endoo.se"

interface RenderedEmail {
  subject: string
  html:    string
}

// ─── invoice_overdue ──────────────────────────────────────────────────────────

function renderInvoiceOverdue(payload: Record<string, unknown>): RenderedEmail {
  const num        = (payload.invoiceNumber as string) ?? "–"
  const contact    = (payload.contactName as string | null) ?? "Okänd kund"
  const amount     = formatAmount(payload.totalAmount as string, payload.currency as string)
  const daysOver   = Number(payload.daysOverdue ?? 0)
  const dueDate    = (payload.dueDate as string) ?? "–"
  const href       = `${APP_BASE}${payload.href ?? "/invoices"}`

  const subject = `⚠ Faktura ${num} är ${daysOver} dagar förfallen`
  const html = emailShell(
    subject,
    `Faktura ${num} till ${contact} förföll för ${daysOver} dagar sedan.`,
    h1(`Faktura förfallen`) +
    alertBox(`Faktura ${num} är <strong>${daysOver} dag${daysOver !== 1 ? "ar" : ""} förfallen</strong>.`) +
    factsTable(
      factRow("Fakturanummer", num) +
      factRow("Kund", contact) +
      factRow("Belopp", amount) +
      factRow("Förfallodatum", dueDate) +
      factRow("Dagar försenad", String(daysOver)),
    ) +
    p("Skicka en betalningspåminnelse eller markera fakturan som betald i Endoo.") +
    ctaButton("Visa faktura", href),
  )
  return { subject, html }
}

// ─── invoice_paid ─────────────────────────────────────────────────────────────

function renderInvoicePaid(payload: Record<string, unknown>): RenderedEmail {
  const num     = (payload.invoiceNumber as string) ?? "–"
  const contact = (payload.contactName as string | null) ?? "Okänd kund"
  const amount  = formatAmount(payload.totalAmount as string, payload.currency as string)
  const method  = formatPaymentMethod(payload.paymentMethod as string)
  const href    = `${APP_BASE}${payload.href ?? "/invoices"}`

  const subject = `✓ Faktura ${num} är betald`
  const html = emailShell(
    subject,
    `Betalning mottagen från ${contact} — ${amount}.`,
    h1("Betalning mottagen") +
    factsTable(
      factRow("Fakturanummer", num) +
      factRow("Kund", contact) +
      factRow("Belopp", amount) +
      factRow("Betalningsmetod", method),
    ) +
    p("Fakturan är nu markerad som betald och transaktionen har bokförts.") +
    ctaButton("Visa faktura", href),
  )
  return { subject, html }
}

// ─── approval_needed ──────────────────────────────────────────────────────────

function renderApprovalNeeded(payload: Record<string, unknown>): RenderedEmail {
  const supplier = (payload.supplierName as string | null) ?? "Okänd leverantör"
  const num      = (payload.invoiceNumber as string | null) ?? "–"
  const amount   = formatAmount(payload.amountInclVat as string, payload.currency as string)
  const step     = (payload.stepName as string) ?? "Attest"
  const href     = `${APP_BASE}${payload.href ?? "/attest"}`

  const subject = `Åtgärd krävs: Attestera faktura ${num} från ${supplier}`
  const html = emailShell(
    subject,
    `Du behöver attestera en leverantörsfaktura från ${supplier}.`,
    h1("Attest begärd") +
    p(`Du har fått en leverantörsfaktura att attestera i steget <strong>${step}</strong>.`) +
    factsTable(
      factRow("Leverantör", supplier) +
      factRow("Fakturanummer", num) +
      factRow("Belopp inkl. moms", amount) +
      factRow("Atteststeg", step),
    ) +
    p("Logga in i Endoo för att granska, godkänna eller avvisa fakturan.") +
    ctaButton("Granska faktura", href),
  )
  return { subject, html }
}

// ─── approval_outcome ─────────────────────────────────────────────────────────

function renderApprovalOutcome(payload: Record<string, unknown>): RenderedEmail {
  const supplier  = (payload.supplierName as string | null) ?? "Okänd leverantör"
  const num       = (payload.invoiceNumber as string | null) ?? "–"
  const amount    = formatAmount(payload.amountInclVat as string, payload.currency as string)
  const outcome   = payload.outcome as "approved" | "rejected"
  const reason    = payload.rejectionReason as string | null
  const href      = `${APP_BASE}${payload.href ?? "/supplier-invoices"}`

  const isApproved   = outcome === "approved"
  const outcomeLabel = isApproved ? "godkänd ✓" : "avslagen ✗"
  const subject      = `Faktura ${num} är ${outcomeLabel}`

  const html = emailShell(
    subject,
    `Leverantörsfaktura ${num} från ${supplier} har ${outcomeLabel}.`,
    h1(isApproved ? "Faktura godkänd" : "Faktura avslagen") +
    (isApproved
      ? p("Alla atteststeg är godkända. Fakturan är nu redo att bokas.")
      : p("Fakturan avslades i attestflödet och har skickats tillbaka för granskning.")) +
    factsTable(
      factRow("Leverantör", supplier) +
      factRow("Fakturanummer", num) +
      factRow("Belopp inkl. moms", amount) +
      (reason ? factRow("Orsak till avslag", reason) : ""),
    ) +
    ctaButton("Visa faktura", href),
  )
  return { subject, html }
}

// ─── vat_period_approaching ───────────────────────────────────────────────────

function renderVatPeriodApproaching(payload: Record<string, unknown>): RenderedEmail {
  const label   = (payload.periodLabel as string) ?? "–"
  const due     = (payload.dueDate as string) ?? "–"
  const days    = Number(payload.daysRemaining ?? 0)
  const href    = `${APP_BASE}${payload.href ?? "/accounting/vat"}`

  const subject = `Momsdeklaration ${label} — ${days} dag${days !== 1 ? "ar" : ""} kvar`
  const html = emailShell(
    subject,
    `Momsperiod ${label} förfaller om ${days} dagar (${due}).`,
    h1("Momsdeklaration närmar sig") +
    alertBox(`Perioden <strong>${label}</strong> förfaller <strong>${due}</strong> — ${days} dag${days !== 1 ? "ar" : ""} kvar.`, "#eff6ff", "#3b82f6") +
    p("Logga in i Endoo för att granska och lämna in momsdeklarationen.") +
    ctaButton("Hantera moms", href),
  )
  return { subject, html }
}

// ─── subscription_payment_failed ─────────────────────────────────────────────

function renderSubscriptionPaymentFailed(payload: Record<string, unknown>): RenderedEmail {
  const href    = `${APP_BASE}${payload.href ?? "/settings/billing"}`
  const subject = "Betalning misslyckades — uppdatera betalningsuppgifter"
  const html = emailShell(
    subject,
    "Din Endoo-prenumeration kunde inte förnyas. Uppdatera dina betalningsuppgifter.",
    h1("Betalning misslyckades") +
    alertBox("Din prenumerationsbetalning misslyckades. Uppdatera dina betalningsuppgifter för att undvika avbrott i tjänsten.", "#fef2f2", "#ef4444") +
    p("Om betalningen misslyckas upprepade gånger kan ditt konto begränsas.") +
    ctaButton("Uppdatera betalning", href),
  )
  return { subject, html }
}

// ─── member_joined ────────────────────────────────────────────────────────────

function renderMemberJoined(payload: Record<string, unknown>): RenderedEmail {
  const name  = (payload.userName as string) ?? "En ny användare"
  const email = (payload.userEmail as string) ?? ""
  const href  = `${APP_BASE}${payload.href ?? "/settings/users"}`

  const subject = `${name} har gått med i er organisation`
  const html = emailShell(
    subject,
    `${name} (${email}) är nu medlem i er Endoo-organisation.`,
    h1("Ny teammedlem") +
    factsTable(
      factRow("Namn", name) +
      factRow("E-post", email),
    ) +
    p("Du kan hantera teammedlemmar och behörigheter i inställningarna.") +
    ctaButton("Hantera team", href),
  )
  return { subject, html }
}

// ─── generic ──────────────────────────────────────────────────────────────────

function renderGeneric(payload: Record<string, unknown>): RenderedEmail {
  const title   = (payload.displayTitle as string) ?? "Endoo-notifikation"
  const body    = (payload.displaySubtitle as string | null) ?? ""
  const href    = (payload.href as string | null)
  const subject = title
  const html = emailShell(
    subject,
    body,
    h1(title) +
    (body ? p(body) : "") +
    (href ? ctaButton("Öppna i Endoo", `${APP_BASE}${href}`) : ""),
  )
  return { subject, html }
}

// ─── journal_voided ───────────────────────────────────────────────────────────

function renderJournalVoided(payload: Record<string, unknown>): RenderedEmail {
  const ref    = (payload.originalReference as string) ?? "–"
  const revRef = (payload.reversalReference as string) ?? "–"
  const reason = (payload.reason as string) ?? "–"
  const href   = `${APP_BASE}${payload.href ?? "/accounting/journals"}`

  const subject = `Verifikation ${ref} makulerad`
  const html = emailShell(
    subject,
    `Verifikation ${ref} har makulerats och en motpost (${revRef}) skapades.`,
    h1("Verifikation makulerad") +
    alertBox(`Verifikation <strong>${ref}</strong> är makulerad.`, "#fef3c7", "#f59e0b") +
    factsTable(
      factRow("Original", ref) +
      factRow("Motpost", revRef) +
      factRow("Orsak", reason),
    ) +
    p("En motpost har bokförts automatiskt i aktuell öppen period.") +
    ctaButton("Visa verifikation", href),
  )
  return { subject, html }
}

// ─── period_locked ────────────────────────────────────────────────────────────

function renderPeriodLocked(payload: Record<string, unknown>): RenderedEmail {
  const year   = Number(payload.year ?? 0)
  const month  = Number(payload.month ?? 0)
  const count  = Number(payload.journalCount ?? 0)
  const label  = `${year}-${String(month).padStart(2, "0")}`
  const href   = `${APP_BASE}${payload.href ?? "/accounting/periods"}`

  const subject = `Period ${label} låst`
  const html = emailShell(
    subject,
    `Bokföringsperiod ${label} är låst med ${count} verifikationer.`,
    h1("Period låst") +
    factsTable(
      factRow("Period", label) +
      factRow("Antal verifikationer", String(count)),
    ) +
    p("Perioden är nu låst. Inga nya verifikationer kan bokföras i denna period.") +
    ctaButton("Visa period", href),
  )
  return { subject, html }
}

// ─── period_unlocked ──────────────────────────────────────────────────────────

function renderPeriodUnlocked(payload: Record<string, unknown>): RenderedEmail {
  const year   = Number(payload.year ?? 0)
  const month  = Number(payload.month ?? 0)
  const reason = (payload.reason as string) ?? "–"
  const label  = `${year}-${String(month).padStart(2, "0")}`
  const href   = `${APP_BASE}${payload.href ?? "/accounting/periods"}`

  const subject = `⚠ Period ${label} upplåst`
  const html = emailShell(
    subject,
    `Bokföringsperiod ${label} har upplåsts.`,
    h1("Period upplåst") +
    alertBox(`Period <strong>${label}</strong> har upplåsts. Bokföring i perioden är nu möjlig igen.`) +
    factsTable(
      factRow("Period", label) +
      factRow("Orsak till upplåsning", reason),
    ) +
    p("Granska att bokföringen i perioden är korrekt och lås den igen snarast.") +
    ctaButton("Visa period", href),
  )
  return { subject, html }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function renderTemplate(
  template: NotificationTemplate,
  payload: Record<string, unknown>,
): RenderedEmail {
  switch (template) {
    case "invoice_overdue":           return renderInvoiceOverdue(payload)
    case "invoice_paid":              return renderInvoicePaid(payload)
    case "approval_needed":           return renderApprovalNeeded(payload)
    case "approval_outcome":          return renderApprovalOutcome(payload)
    case "vat_period_approaching":    return renderVatPeriodApproaching(payload)
    case "subscription_payment_failed": return renderSubscriptionPaymentFailed(payload)
    case "member_joined":             return renderMemberJoined(payload)
    case "generic":                   return renderGeneric(payload)
    case "journal_voided":            return renderJournalVoided(payload)
    case "period_locked":             return renderPeriodLocked(payload)
    case "period_unlocked":           return renderPeriodUnlocked(payload)
    // Digest rendered separately (batch)
    case "approval_reminder":         return renderGeneric(payload)
    case "contract_expiring":         return renderGeneric(payload)
    case "digest":                    return renderGeneric(payload)
    default:                          return renderGeneric(payload)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amountOre: string, currency = "SEK"): string {
  const kr = Number(amountOre) / 100
  return `${kr.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    bank_transfer: "Banköverföring",
    card:          "Kort",
    swish:         "Swish",
    cash:          "Kontant",
    credit_note:   "Kreditnota",
    other:         "Övrigt",
  }
  return map[method] ?? method
}
