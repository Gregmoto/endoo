/**
 * GET  /api/settings/email  — fetch email settings for the active org
 * PATCH /api/settings/email  — update email settings
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SETTING_KEYS } from "@/lib/settings/keys"
import { z } from "zod"

const EMAIL_KEYS = [
  SETTING_KEYS.EMAIL_SENDER_NAME,
  SETTING_KEYS.EMAIL_SENDER_ADDRESS,
  SETTING_KEYS.EMAIL_REPLY_TO,
  SETTING_KEYS.EMAIL_INVOICE_SUBJECT,
  SETTING_KEYS.EMAIL_INVOICE_BODY,
  SETTING_KEYS.EMAIL_REMINDER_SUBJECT,
  SETTING_KEYS.EMAIL_REMINDER_BODY,
] as const

const DEFAULTS = {
  senderName:      "",
  senderAddress:   "",
  replyTo:         "",
  invoiceSubject:  "Faktura {{invoice_number}} från {{org_name}}",
  invoiceBody:     "Hej {{recipient_name}},\n\nBifogar faktura {{invoice_number}} på {{total}} {{currency}} med förfallodatum {{due_date}}.\n\nMed vänliga hälsningar\n{{org_name}}",
  reminderSubject: "Påminnelse: Faktura {{invoice_number}} förfaller {{due_date}}",
  reminderBody:    "Hej {{recipient_name}},\n\nVi vill påminna om att faktura {{invoice_number}} på {{total}} {{currency}} förfaller {{due_date}}.\n\nMed vänliga hälsningar\n{{org_name}}",
}

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:read")

    const settings = await prisma.organizationSetting.findMany({
      where: {
        organizationId: ctx.organizationId,
        key: { in: EMAIL_KEYS as unknown as string[] },
      },
    })

    const map = Object.fromEntries(settings.map(s => [s.key, s.value]))

    return Response.json({
      senderName:      map[SETTING_KEYS.EMAIL_SENDER_NAME]     ?? DEFAULTS.senderName,
      senderAddress:   map[SETTING_KEYS.EMAIL_SENDER_ADDRESS]  ?? DEFAULTS.senderAddress,
      replyTo:         map[SETTING_KEYS.EMAIL_REPLY_TO]        ?? DEFAULTS.replyTo,
      invoiceSubject:  map[SETTING_KEYS.EMAIL_INVOICE_SUBJECT] ?? DEFAULTS.invoiceSubject,
      invoiceBody:     map[SETTING_KEYS.EMAIL_INVOICE_BODY]    ?? DEFAULTS.invoiceBody,
      reminderSubject: map[SETTING_KEYS.EMAIL_REMINDER_SUBJECT]?? DEFAULTS.reminderSubject,
      reminderBody:    map[SETTING_KEYS.EMAIL_REMINDER_BODY]   ?? DEFAULTS.reminderBody,
    })
  } catch (err) {
    return handleError(err)
  }
}

const PatchSchema = z.object({
  senderName:      z.string().max(100).optional(),
  senderAddress:   z.string().email().max(255).optional().or(z.literal("")),
  replyTo:         z.string().email().max(255).optional().or(z.literal("")),
  invoiceSubject:  z.string().max(255).optional(),
  invoiceBody:     z.string().max(5000).optional(),
  reminderSubject: z.string().max(255).optional(),
  reminderBody:    z.string().max(5000).optional(),
})

export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const keyMap: Record<string, string> = {
      senderName:      SETTING_KEYS.EMAIL_SENDER_NAME,
      senderAddress:   SETTING_KEYS.EMAIL_SENDER_ADDRESS,
      replyTo:         SETTING_KEYS.EMAIL_REPLY_TO,
      invoiceSubject:  SETTING_KEYS.EMAIL_INVOICE_SUBJECT,
      invoiceBody:     SETTING_KEYS.EMAIL_INVOICE_BODY,
      reminderSubject: SETTING_KEYS.EMAIL_REMINDER_SUBJECT,
      reminderBody:    SETTING_KEYS.EMAIL_REMINDER_BODY,
    }

    await Promise.all(
      Object.entries(parsed.data).map(([field, value]) => {
        const key = keyMap[field]
        if (!key || value === undefined) return Promise.resolve()
        return prisma.organizationSetting.upsert({
          where: { organizationId_key: { organizationId: ctx.organizationId, key } },
          create: { organizationId: ctx.organizationId, key, value: value as string },
          update: { value: value as string },
        })
      })
    )

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Organization",
        entityId:       ctx.organizationId,
        meta:           { section: "email", keys: Object.keys(parsed.data) },
      },
    }).catch(() => {})

    return Response.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[settings/email]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
