/**
 * E-signing email templates.
 * All sending goes through Resend (same pattern as src/lib/email.ts).
 */

import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.EMAIL_FROM ?? "Endoo <noreply@endoo.se>"

async function send(to: string, subject: string, html: string, from = FROM) {
  if (!resend) { console.log("[signing:email:dev]", { to, subject }); return }
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) console.error("[signing:email]", error)
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(color: string, headerContent: string, body: string): string {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
<div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
  <div style="background:${color};padding:28px 36px">${headerContent}</div>
  <div style="padding:28px 36px">${body}</div>
  <div style="padding:16px 36px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">Skickat via Endoo · Säker e-signering</p>
  </div>
</div></body></html>`
}

function btn(url: string, label: string): string {
  return `<p style="margin:24px 0 0"><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a></p>`
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151">${text}</p>`
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export async function sendSigningInvite({
  to, signerName, fromOrgName, documentTitle, message, signingUrl, expiresAt, color = "#4f46e5",
}: {
  to: string
  signerName: string
  fromOrgName: string
  documentTitle: string
  message?: string | null
  signingUrl: string
  expiresAt: Date
  color?: string
}) {
  const header = `
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px">Signering begärd</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${esc(documentTitle)}</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.75)">Från ${esc(fromOrgName)}</p>`

  const expiry = expiresAt.toLocaleDateString("sv-SE")
  const body = `
    ${p(`Hej ${esc(signerName)},`)}
    ${p(`<strong>${esc(fromOrgName)}</strong> har begärt din signatur på <strong>${esc(documentTitle)}</strong>.`)}
    ${message ? p(`<em>${esc(message)}</em>`) : ""}
    ${p(`Begäran är giltig till och med <strong>${expiry}</strong>.`)}
    ${btn(signingUrl, "Granska och signera →")}
    ${p(`<span style="font-size:12px;color:#6b7280">Eller öppna länken:<br><a href="${signingUrl}" style="color:#4f46e5">${signingUrl}</a></span>`)}
    <hr style="margin:24px 0;border:none;border-top:1px solid #f0f0f0">
    ${p(`<span style="font-size:12px;color:#9ca3af">Genom att signera godkänner du att din e-postadress och IP-adress registreras som en del av signeringsprocessen.</span>`)}`

  await send(to, `Signering begärd: ${documentTitle}`, layout(color, header, body))
}

// ─── Reminder ─────────────────────────────────────────────────────────────────

export async function sendSigningReminder({
  to, signerName, fromOrgName, documentTitle, signingUrl, expiresAt, color = "#4f46e5",
}: {
  to: string
  signerName: string
  fromOrgName: string
  documentTitle: string
  signingUrl: string
  expiresAt: Date
  color?: string
}) {
  const header = `
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px">Påminnelse</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${esc(documentTitle)}</p>`

  const expiry = expiresAt.toLocaleDateString("sv-SE")
  const body = `
    ${p(`Hej ${esc(signerName)},`)}
    ${p(`Vi vill påminna om att din signatur fortfarande väntas på <strong>${esc(documentTitle)}</strong> från <strong>${esc(fromOrgName)}</strong>.`)}
    ${p(`Begäran är giltig till och med <strong>${expiry}</strong>.`)}
    ${btn(signingUrl, "Signera nu →")}`

  await send(to, `Påminnelse: signatur begärd på ${documentTitle}`, layout(color, header, body))
}

// ─── Partially signed (notify sender) ────────────────────────────────────────

export async function sendPartiallySignedNotice({
  to, signerName, documentTitle, remainingCount,
}: {
  to: string
  signerName: string
  documentTitle: string
  remainingCount: number
}) {
  const header = `<p style="margin:0;font-size:18px;font-weight:700;color:#fff">✓ ${esc(signerName)} har signerat</p>`
  const body = `
    ${p(`<strong>${esc(signerName)}</strong> har signerat <strong>${esc(documentTitle)}</strong>.`)}
    ${p(`Väntar fortfarande på ${remainingCount} signerare.`)}`

  await send(to, `${signerName} har signerat: ${documentTitle}`, layout("#059669", header, body))
}

// ─── Completed ────────────────────────────────────────────────────────────────

export async function sendCompletedNotice({
  to, documentTitle, signers,
}: {
  to: string
  documentTitle: string
  signers: Array<{ name: string; signedAt: Date | null }>
}) {
  const header = `<p style="margin:0;font-size:18px;font-weight:700;color:#fff">✓ Alla har signerat</p>`
  const signerList = signers
    .map(s => `<li style="margin:4px 0">${esc(s.name)}${s.signedAt ? ` — ${s.signedAt.toLocaleDateString("sv-SE")}` : ""}</li>`)
    .join("")
  const body = `
    ${p(`<strong>${esc(documentTitle)}</strong> har signerats av alla parter.`)}
    <ul style="margin:12px 0;padding-left:20px;font-size:14px;color:#374151">${signerList}</ul>`

  await send(to, `Signerat: ${documentTitle}`, layout("#059669", header, body))
}

// ─── Declined ────────────────────────────────────────────────────────────────

export async function sendDeclinedNotice({
  to, signerName, documentTitle, reason,
}: {
  to: string
  signerName: string
  documentTitle: string
  reason?: string | null
}) {
  const header = `<p style="margin:0;font-size:18px;font-weight:700;color:#fff">✗ ${esc(signerName)} avböjde</p>`
  const body = `
    ${p(`<strong>${esc(signerName)}</strong> avböjde att signera <strong>${esc(documentTitle)}</strong>.`)}
    ${reason ? p(`Anledning: <em>${esc(reason)}</em>`) : ""}`

  await send(to, `Avböjt: ${documentTitle}`, layout("#dc2626", header, body))
}

// ─── Expired ────────────────────────────────────────────────────────────────

export async function sendExpiredNotice({
  to, documentTitle,
}: {
  to: string
  documentTitle: string
}) {
  const header = `<p style="margin:0;font-size:18px;font-weight:700;color:#fff">Signeringsbegäran löpte ut</p>`
  const body = `${p(`Signeringsbegäran för <strong>${esc(documentTitle)}</strong> löpte ut utan att alla signerare slutförde.`)}`

  await send(to, `Utgången: ${documentTitle}`, layout("#6b7280", header, body))
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
