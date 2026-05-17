/**
 * Email sending via Resend.
 *
 * Requires env:
 *   RESEND_API_KEY   — from resend.com
 *   EMAIL_FROM       — fallback sender, e.g. "Endoo <faktura@endoo.se>"
 *
 * If RESEND_API_KEY is not set, falls back to console.log (dev mode).
 * Org-specific sender / templates loaded by callers from OrganizationSetting.
 */

import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const PLATFORM_FROM = process.env.EMAIL_FROM ?? "Endoo <noreply@endoo.se>"

// ─── Variable substitution ────────────────────────────────────────────────────

export type TemplateVars = {
  invoice_number: string
  org_name:       string
  recipient_name: string
  total:          string
  currency:       string
  due_date:       string
  balance?:       string
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (vars as Record<string, string>)[key] ?? `{{${key}}}`
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailBranding = {
  primaryColor?: string | null
  logoUrl?:      string | null
}

export type InvoiceEmailData = {
  to: string
  // Org settings (loaded by caller)
  senderName?:     string | null
  senderAddress?:  string | null
  replyTo?:        string | null
  branding?:       EmailBranding
  // Template from settings (subject / plain-text body)
  subjectTemplate?: string | null
  bodyTemplate?:    string | null
  // Fallback data for default templates
  orgName:        string
  invoiceNumber:  string
  invoiceDate:    string
  dueDate:        string
  currency:       string
  totalAmount:    bigint | number
  contactName:    string
  notes?:         string | null
  lines: Array<{
    description: string
    quantity:    number
    unitPrice:   bigint | number
    taxRate:     number
    total:       bigint | number
  }>
}

export type ReminderEmailData = {
  to: string
  senderName?:     string | null
  senderAddress?:  string | null
  replyTo?:        string | null
  branding?:       EmailBranding
  subjectTemplate?: string | null
  bodyTemplate?:    string | null
  orgName:        string
  invoiceNumber:  string
  dueDate:        string
  currency:       string
  balanceAmount:  bigint | number
  contactName:    string
}

// ─── Send invoice email ───────────────────────────────────────────────────────

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<{ id?: string; error?: string }> {
  const vars: TemplateVars = {
    invoice_number: data.invoiceNumber,
    org_name:       data.orgName,
    recipient_name: data.contactName,
    total:          fmtAmount(data.totalAmount, data.currency),
    currency:       data.currency,
    due_date:       data.dueDate,
  }

  const subject = data.subjectTemplate
    ? renderTemplate(data.subjectTemplate, vars)
    : `Faktura ${data.invoiceNumber} från ${data.orgName}`

  const from = buildFrom(data.senderName, data.senderAddress)

  const html = data.bodyTemplate
    ? buildTextWrapHtml(renderTemplate(data.bodyTemplate, vars), data, data.branding)
    : buildInvoiceHtml(data, data.branding)

  return sendEmail({ from, replyTo: data.replyTo ?? undefined, to: data.to, subject, html })
}

// ─── Send reminder email ──────────────────────────────────────────────────────

export async function sendReminderEmail(data: ReminderEmailData): Promise<{ id?: string; error?: string }> {
  const vars: TemplateVars = {
    invoice_number: data.invoiceNumber,
    org_name:       data.orgName,
    recipient_name: data.contactName,
    total:          fmtAmount(data.balanceAmount, data.currency),
    currency:       data.currency,
    due_date:       data.dueDate,
    balance:        fmtAmount(data.balanceAmount, data.currency),
  }

  const subject = data.subjectTemplate
    ? renderTemplate(data.subjectTemplate, vars)
    : `Påminnelse: Faktura ${data.invoiceNumber} förfaller ${data.dueDate}`

  const body = data.bodyTemplate
    ? renderTemplate(data.bodyTemplate, vars)
    : `Hej ${data.contactName},\n\nVi vill påminna om att faktura ${data.invoiceNumber} på ${fmtAmount(data.balanceAmount, data.currency)} förfaller ${data.dueDate}.\n\nMed vänliga hälsningar\n${data.orgName}`

  const from = buildFrom(data.senderName, data.senderAddress)
  const html = buildTextWrapHtml(body, null, data.branding)

  return sendEmail({ from, replyTo: data.replyTo ?? undefined, to: data.to, subject, html })
}

// ─── Core send ────────────────────────────────────────────────────────────────

async function sendEmail({
  from, replyTo, to, subject, html,
}: { from: string; replyTo?: string; to: string; subject: string; html: string }): Promise<{ id?: string; error?: string }> {
  if (!resend) {
    console.log("[email:dev]", { to, subject })
    return { id: "dev-mode" }
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo,
    subject,
    html,
  })

  if (error) {
    console.error("[email] Resend error:", error)
    return { error: error.message }
  }

  return { id: data?.id }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFrom(name?: string | null, address?: string | null): string {
  if (name && address) return `${name} <${address}>`
  if (address)         return address
  return PLATFORM_FROM
}

function fmtAmount(n: bigint | number, currency: string): string {
  return `${(Number(n) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

// Wrap plain text body in minimal branded HTML
function buildTextWrapHtml(body: string, data: InvoiceEmailData | null, branding?: EmailBranding): string {
  const color = branding?.primaryColor ?? "#4f46e5"
  const lines = body.split("\n").map(l => `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151">${l || "&nbsp;"}</p>`).join("")
  const logoHtml = branding?.logoUrl
    ? `<img src="${branding.logoUrl}" alt="" style="height:36px;margin-bottom:12px;display:block" />`
    : ""
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <div style="background:${color};padding:24px 32px">
      ${logoHtml}
      <p style="margin:0;font-size:18px;font-weight:700;color:#fff">${data?.orgName ?? ""}</p>
      ${data ? `<p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7)">Faktura ${data.invoiceNumber}</p>` : ""}
    </div>
    <div style="padding:28px 32px">${lines}</div>
    <div style="padding:16px 32px;border-top:1px solid #f0f0f0"><p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">Skickat via Endoo</p></div>
  </div></body></html>`
}

// Full HTML invoice with line items table
function buildInvoiceHtml(d: InvoiceEmailData, branding?: EmailBranding): string {
  const color = branding?.primaryColor ?? "#4f46e5"
  const logoHtml = branding?.logoUrl
    ? `<img src="${branding.logoUrl}" alt="" style="height:40px;margin-bottom:14px;display:block" />`
    : ""
  const rows = d.lines.map(l => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${l.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${Number(l.quantity)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmtAmount(l.unitPrice, d.currency)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${Math.round(l.taxRate * 100)}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${fmtAmount(l.total, d.currency)}</td>
    </tr>`).join("")

  return `<!DOCTYPE html>
<html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <div style="max-width:640px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <div style="background:${color};padding:32px 40px">
      ${logoHtml}
      <p style="margin:0;font-size:22px;font-weight:700;color:#fff">${d.orgName}</p>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.7)">Faktura ${d.invoiceNumber}</p>
    </div>
    <div style="padding:28px 40px;border-bottom:1px solid #f0f0f0;display:flex;gap:40px">
      <div><p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Till</p><p style="margin:4px 0 0;font-size:15px;font-weight:600">${d.contactName}</p></div>
      <div><p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Fakturadatum</p><p style="margin:4px 0 0;font-size:15px">${d.invoiceDate}</p></div>
      <div><p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Förfallodatum</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#dc2626">${d.dueDate}</p></div>
    </div>
    <div style="padding:0 40px">
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
        <thead><tr style="background:#f9fafb">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Beskrivning</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Antal</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">À-pris</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Moms</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">Summa</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:20px 40px 28px;border-top:2px solid #f0f0f0;text-align:right">
      <p style="margin:0;font-size:13px;color:#6b7280">Totalt att betala</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700">${fmtAmount(d.totalAmount, d.currency)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">inkl. moms</p>
    </div>
    ${d.notes ? `<div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #f0f0f0"><p style="margin:0;font-size:13px;color:#374151">${d.notes}</p></div>` : ""}
    <div style="padding:20px 40px;border-top:1px solid #f0f0f0"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">Skickat via Endoo · ${d.orgName}</p></div>
  </div>
</body></html>`
}
