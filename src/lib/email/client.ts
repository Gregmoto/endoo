import { Resend } from "resend"

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const FROM_DOMAIN = process.env.RESEND_FROM_DOMAIN ?? "mail.endoo.se"
export const FROM_NAME   = process.env.RESEND_FROM_NAME   ?? "Endoo"
export const DEFAULT_FROM = `${FROM_NAME} <noreply@${FROM_DOMAIN}>`
export const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET ?? ""
