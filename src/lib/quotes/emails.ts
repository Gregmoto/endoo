/**
 * Quote email templates.
 * Same pattern as src/lib/signing/emails.ts.
 */

import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.EMAIL_FROM ?? "Endoo <noreply@endoo.se>"

async function send(to: string, subject: string, html: string) {
  if (!resend) { console.log("[quotes:email:dev]", { to, subject }); return }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) console.error("[quotes:email]", error)
}

function layout(color: string, headerContent: string, body: string): string {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
<div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
  <div style="background:${color};padding:28px 36px">${headerContent}</div>
  <div style="padding:28px 36px">${body}</div>
  <div style="padding:16px 36px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">Skickat via Endoo</p>
  </div>
</div></body></html>`
}

function btn(url: string, label: string): string {
  return `<p style="margin:24px 0 0"><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a></p>`
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151">${text}</p>`
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// ─── Quote invite (to customer) ───────────────────────────────────────────────

export async function sendQuoteInvite({
  to, contactName, fromOrgName, quoteNumber, quoteTitle, message, approvalUrl, validUntil, color = "#4f46e5",
}: {
  to: string
  contactName: string
  fromOrgName: string
  quoteNumber: string
  quoteTitle?: string | null
  message?: string | null
  approvalUrl: string
  validUntil?: Date | null
  color?: string
}) {
  const title = quoteTitle ?? quoteNumber
  const header = `
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px">Offert</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${esc(title)}</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.75)">Från ${esc(fromOrgName)}</p>`

  const expiry = validUntil ? validUntil.toLocaleDateString("sv-SE") : null
  const body = `
    ${p(`Hej ${esc(contactName)},`)}
    ${p(`<strong>${esc(fromOrgName)}</strong> har skickat dig offert <strong>${esc(quoteNumber)}</strong>.`)}
    ${message ? p(`<em>${esc(message)}</em>`) : ""}
    ${expiry ? p(`Offerten är giltig till och med <strong>${expiry}</strong>.`) : ""}
    ${btn(approvalUrl, "Granska offert →")}
    ${p(`<span style="font-size:12px;color:#6b7280">Eller öppna länken:<br><a href="${approvalUrl}" style="color:#4f46e5">${approvalUrl}</a></span>`)}`

  await send(to, `Offert ${quoteNumber} från ${fromOrgName}`, layout(color, header, body))
}

// ─── Quote accepted (to sender) ───────────────────────────────────────────────

export async function sendQuoteAccepted({
  to, contactName, quoteNumber, quoteTitle, note, quoteUrl,
}: {
  to: string
  contactName: string
  quoteNumber: string
  quoteTitle?: string | null
  note?: string | null
  quoteUrl: string
}) {
  const title = quoteTitle ?? quoteNumber
  const header = `<p style="margin:0;font-size:18px;font-weight:700;color:#fff">✓ ${esc(contactName)} godkände offerten</p>`
  const body = `
    ${p(`<strong>${esc(contactName)}</strong> har godkänt offert <strong>${esc(title)}</strong>.`)}
    ${note ? p(`Kommentar: <em>${esc(note)}</em>`) : ""}
    ${btn(quoteUrl, "Visa offert →")}`

  await send(to, `Offert godkänd: ${quoteNumber}`, layout("#059669", header, body))
}

// ─── Quote declined (to sender) ───────────────────────────────────────────────

export async function sendQuoteDeclined({
  to, contactName, quoteNumber, quoteTitle, note, quoteUrl,
}: {
  to: string
  contactName: string
  quoteNumber: string
  quoteTitle?: string | null
  note?: string | null
  quoteUrl: string
}) {
  const title = quoteTitle ?? quoteNumber
  const header = `<p style="margin:0;font-size:18px;font-weight:700;color:#fff">✗ ${esc(contactName)} avböjde offerten</p>`
  const body = `
    ${p(`<strong>${esc(contactName)}</strong> har avböjt offert <strong>${esc(title)}</strong>.`)}
    ${note ? p(`Anledning: <em>${esc(note)}</em>`) : ""}
    ${btn(quoteUrl, "Visa offert →")}`

  await send(to, `Offert avböjd: ${quoteNumber}`, layout("#dc2626", header, body))
}

// ─── Quote expired (to sender) ────────────────────────────────────────────────

export async function sendQuoteExpired({
  to, quoteNumber, quoteTitle,
}: {
  to: string
  quoteNumber: string
  quoteTitle?: string | null
}) {
  const title = quoteTitle ?? quoteNumber
  const header = `<p style="margin:0;font-size:18px;font-weight:700;color:#fff">Offert löpte ut</p>`
  const body = `${p(`Offert <strong>${esc(title)}</strong> löpte ut utan svar från kunden.`)}`

  await send(to, `Offert utgången: ${quoteNumber}`, layout("#6b7280", header, body))
}

// ─── Quote reminder (to customer) ─────────────────────────────────────────────

export async function sendQuoteReminder({
  to, contactName, fromOrgName, quoteNumber, quoteTitle, approvalUrl, validUntil, color = "#4f46e5",
}: {
  to: string
  contactName: string
  fromOrgName: string
  quoteNumber: string
  quoteTitle?: string | null
  approvalUrl: string
  validUntil?: Date | null
  color?: string
}) {
  const title = quoteTitle ?? quoteNumber
  const expiry = validUntil ? validUntil.toLocaleDateString("sv-SE") : null
  const header = `
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px">Påminnelse — Offert</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${esc(title)}</p>`
  const body = `
    ${p(`Hej ${esc(contactName)},`)}
    ${p(`Vi vill påminna om offert <strong>${esc(quoteNumber)}</strong> från <strong>${esc(fromOrgName)}</strong> som väntar på ditt svar.`)}
    ${expiry ? p(`Offerten är giltig till och med <strong>${expiry}</strong>.`) : ""}
    ${btn(approvalUrl, "Granska offert →")}`

  await send(to, `Påminnelse: Offert ${quoteNumber} från ${fromOrgName}`, layout(color, header, body))
}
