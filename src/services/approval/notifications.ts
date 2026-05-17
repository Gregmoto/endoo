/**
 * Approval notification helpers.
 *
 * Both functions are designed for fire-and-forget usage:
 *   notifyStepApprovers(...).catch(() => {})
 *   notifyRequestOutcome(...).catch(() => {})
 *
 * Email is sent via the project's Resend-backed sendEmail wrapper.
 * If RESEND_API_KEY is not set the helper logs to console (dev mode).
 * Swap the sendApprovalEmail call for any transactional provider as needed.
 */

import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────
// Internal email sender (swap-point for provider)
// ─────────────────────────────────────────────

const PLATFORM_FROM = process.env.EMAIL_FROM ?? "Endoo <noreply@endoo.se>"

async function sendApprovalEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[approval:email:dev]", { to: opts.to, subject: opts.subject })
    return
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: PLATFORM_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })

  if (error) {
    console.error("[approval:email] Resend error:", error)
  }
}

// ─────────────────────────────────────────────
// HTML helpers
// ─────────────────────────────────────────────

function approvalEmailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <div style="background:#4f46e5;padding:24px 32px">
      <p style="margin:0;font-size:18px;font-weight:700;color:#fff">Endoo</p>
      <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe">${title}</p>
    </div>
    <div style="padding:28px 32px">${bodyHtml}</div>
    <div style="padding:16px 32px;border-top:1px solid #f0f0f0">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">Skickat via Endoo</p>
    </div>
  </div>
</body></html>`
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151">${text}</p>`
}

// ─────────────────────────────────────────────
// notifyStepApprovers
// ─────────────────────────────────────────────

export async function notifyStepApprovers(
  organizationId: string,
  request: { id: string; round: number },
  step: { id: string; name: string; resolvedApproverIds: string[] },
  invoice: {
    supplierName: string | null
    invoiceNumber: string | null
    amountInclVat: bigint | null
  },
): Promise<void> {
  if (step.resolvedApproverIds.length === 0) return

  // Fetch approver email addresses
  const users = await prisma.user.findMany({
    where: { id: { in: step.resolvedApproverIds } },
    select: { id: true, email: true, fullName: true },
  })

  const supplierDisplay = invoice.supplierName ?? "okänd leverantör"
  const invoiceDisplay = invoice.invoiceNumber
    ? `#${invoice.invoiceNumber}`
    : "(inget fakturanummer)"
  const amountDisplay = invoice.amountInclVat != null
    ? `${(Number(invoice.amountInclVat) / 100).toLocaleString("sv-SE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} SEK`
    : "okänt belopp"

  const subject = `Åtgärd krävs: Attestera leverantörsfaktura ${invoiceDisplay} från ${supplierDisplay}`

  const bodyHtml = [
    p(`Du har fått en leverantörsfaktura att attestera.`),
    p(`<strong>Steg:</strong> ${step.name}`),
    p(`<strong>Leverantör:</strong> ${supplierDisplay}`),
    p(`<strong>Fakturanummer:</strong> ${invoiceDisplay}`),
    p(`<strong>Belopp inkl. moms:</strong> ${amountDisplay}`),
    p(`Logga in i Endoo för att granska och attestera fakturan.`),
  ].join("")

  const html = approvalEmailShell(`Attest begärd — ${supplierDisplay}`, bodyHtml)

  await Promise.allSettled(
    users.map((user) =>
      sendApprovalEmail({ to: user.email, subject, html }),
    ),
  )
}

// ─────────────────────────────────────────────
// notifyRequestOutcome
// ─────────────────────────────────────────────

export async function notifyRequestOutcome(
  organizationId: string,
  request: {
    id: string
    status: string
    submittedByUserId: string
    rejectionReason: string | null
  },
  invoice: {
    supplierName: string | null
    invoiceNumber: string | null
  },
): Promise<void> {
  const submitter = await prisma.user.findUnique({
    where: { id: request.submittedByUserId },
    select: { email: true, fullName: true },
  })
  if (!submitter) return

  const supplierDisplay = invoice.supplierName ?? "okänd leverantör"
  const invoiceDisplay = invoice.invoiceNumber
    ? `#${invoice.invoiceNumber}`
    : "(inget fakturanummer)"

  const isApproved = request.status === "approved"
  const statusLabel = isApproved ? "godkänd" : "avslagen"
  const subject = `Faktura ${invoiceDisplay} har ${statusLabel}`

  const bodyLines = [
    p(`Leverantörsfaktura ${invoiceDisplay} från ${supplierDisplay} har <strong>${statusLabel}</strong>.`),
  ]

  if (!isApproved && request.rejectionReason) {
    bodyLines.push(p(`<strong>Orsak:</strong> ${request.rejectionReason}`))
  }

  bodyLines.push(p(`Logga in i Endoo för att se detaljer.`))

  const html = approvalEmailShell(
    `Faktura ${statusLabel} — ${supplierDisplay}`,
    bodyLines.join(""),
  )

  await sendApprovalEmail({ to: submitter.email, subject, html })
}
