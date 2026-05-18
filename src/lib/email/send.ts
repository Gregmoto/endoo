/**
 * Provider-agnostic email send abstraction.
 * All callers import this — swap the implementation by editing this file only.
 */

import { render }        from "@react-email/render"
import { resend, DEFAULT_FROM } from "./client"
import type { ReactElement } from "react"

export type Attachment = {
  filename: string
  content:  string | Buffer  // base64 string or Buffer
}

export type SendEmailOptions = {
  to:             string | string[]
  from?:          string
  replyTo?:       string
  subject:        string
  react?:         ReactElement
  html?:          string
  text?:          string
  attachments?:   Attachment[]
  idempotencyKey?: string
  tags?:          { name: string; value: string }[]
}

export type SendEmailResult = {
  id?:    string
  error?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const from = opts.from ?? DEFAULT_FROM

  let html: string | undefined = opts.html
  let text: string | undefined = opts.text

  if (opts.react) {
    html = await render(opts.react)
    if (!text) text = await render(opts.react, { plainText: true })
  }

  if (!html && !text) {
    return { error: "No content: provide react, html, or text" }
  }

  if (!resend) {
    console.log("[email:dev]", {
      to:      opts.to,
      subject: opts.subject,
      from,
    })
    return { id: "dev-" + Date.now() }
  }

  const { data, error } = await resend.emails.send({
    from,
    to:      Array.isArray(opts.to) ? opts.to : [opts.to],
    replyTo: opts.replyTo,
    subject: opts.subject,
    html:    html ?? "",
    text,
    attachments: opts.attachments?.map(a => ({
      filename: a.filename,
      content:  typeof a.content === "string" ? a.content : a.content.toString("base64"),
    })),
    tags:     opts.tags,
    headers:  opts.idempotencyKey
      ? { "Idempotency-Key": opts.idempotencyKey }
      : undefined,
  })

  if (error) {
    console.error("[email] Resend error:", error)
    return { error: error.message }
  }

  return { id: data?.id }
}
