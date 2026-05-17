/**
 * Customer portal email templates.
 */

import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.EMAIL_FROM ?? "Endoo <noreply@endoo.se>"

async function send(to: string, subject: string, html: string, fromName?: string | null) {
  const from = fromName ? `${fromName} <noreply@endoo.se>` : FROM
  if (!resend) { console.log("[portal:email:dev]", { to, subject }); return }
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) console.error("[portal:email]", error)
}

function layout(color: string, header: string, body: string): string {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
  <div style="background:${color};padding:28px 36px">${header}</div>
  <div style="padding:28px 36px">${body}</div>
  <div style="padding:16px 36px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">Kundportal via Endoo</p>
  </div>
</div></body></html>`
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151">${text}</p>`
}

function btn(url: string, label: string, color = "#4f46e5"): string {
  return `<p style="margin:24px 0 8px"><a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${label}</a></p>`
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// ─── Magic link ───────────────────────────────────────────────────────────────

export async function sendPortalMagicLink({
  to, contactName, orgName, loginUrl, expiresMinutes = 10, color = "#4f46e5",
}: {
  to:              string
  contactName:     string
  orgName:         string
  loginUrl:        string
  expiresMinutes?: number
  color?:          string
}) {
  const header = `
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px">Kundportal</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${esc(orgName)}</p>`

  const body = `
    ${p(`Hej ${esc(contactName)},`)}
    ${p(`Klicka på knappen nedan för att logga in på kundportalen. Länken är giltig i <strong>${expiresMinutes} minuter</strong>.`)}
    ${btn(loginUrl, "Logga in →", color)}
    ${p(`<span style="font-size:12px;color:#6b7280">Eller öppna länken manuellt:<br><a href="${loginUrl}" style="color:${color}">${loginUrl}</a></span>`)}
    <hr style="margin:24px 0;border:none;border-top:1px solid #f0f0f0">
    ${p(`<span style="font-size:12px;color:#9ca3af">Om du inte begärde denna länk kan du ignorera mailet.</span>`)}`

  await send(to, `Din inloggningslänk — ${orgName}`, layout(color, header, body))
}
