/**
 * GET  /api/settings/payments  — fetch payment details for the active org
 * PATCH /api/settings/payments  — update payment details
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SETTING_KEYS } from "@/lib/settings/keys"
import { z } from "zod"

const ORG_SELECT = {
  bankName:    true,
  bankgiro:    true,
  plusgiro:    true,
  iban:        true,
  bic:         true,
} as const

const SETTING_KEYS_LIST = [
  SETTING_KEYS.PAYMENT_SWISH,
  SETTING_KEYS.PAYMENT_REFERENCE_FORMAT,
  SETTING_KEYS.PAYMENT_REFERENCE_CUSTOM,
] as const

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:read")

    const [org, settings] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: ORG_SELECT,
      }),
      prisma.organizationSetting.findMany({
        where: {
          organizationId: ctx.organizationId,
          key: { in: SETTING_KEYS_LIST as unknown as string[] },
        },
      }),
    ])

    if (!org) return Response.json({ error: "Org hittades ej" }, { status: 404 })

    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))

    return Response.json({
      ...org,
      swish:           settingsMap[SETTING_KEYS.PAYMENT_SWISH]            ?? "",
      referenceFormat: settingsMap[SETTING_KEYS.PAYMENT_REFERENCE_FORMAT] ?? "invoice_number",
      referenceCustom: settingsMap[SETTING_KEYS.PAYMENT_REFERENCE_CUSTOM] ?? "",
    })
  } catch (err) {
    return handleError(err)
  }
}

const PatchSchema = z.object({
  bankName:        z.string().max(100).optional().nullable(),
  bankgiro:        z.string().max(20).optional().nullable(),
  plusgiro:        z.string().max(20).optional().nullable(),
  iban:            z.string().max(34).optional().nullable(),
  bic:             z.string().max(11).optional().nullable(),
  swish:           z.string().max(20).optional(),
  referenceFormat: z.enum(["invoice_number", "ocr", "custom"]).optional(),
  referenceCustom: z.string().max(100).optional(),
})

export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { swish, referenceFormat, referenceCustom, ...orgFields } = parsed.data

    const settingUpserts: Promise<unknown>[] = []

    if (swish !== undefined) {
      settingUpserts.push(upsertSetting(ctx.organizationId, SETTING_KEYS.PAYMENT_SWISH, swish))
    }
    if (referenceFormat !== undefined) {
      settingUpserts.push(upsertSetting(ctx.organizationId, SETTING_KEYS.PAYMENT_REFERENCE_FORMAT, referenceFormat))
    }
    if (referenceCustom !== undefined) {
      settingUpserts.push(upsertSetting(ctx.organizationId, SETTING_KEYS.PAYMENT_REFERENCE_CUSTOM, referenceCustom))
    }

    await Promise.all([
      Object.keys(orgFields).length > 0
        ? prisma.organization.update({ where: { id: ctx.organizationId }, data: orgFields })
        : Promise.resolve(),
      ...settingUpserts,
    ])

    return Response.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}

async function upsertSetting(orgId: string, key: string, value: unknown) {
  return prisma.organizationSetting.upsert({
    where: { organizationId_key: { organizationId: orgId, key } },
    create: { organizationId: orgId, key, value: value as Parameters<typeof prisma.organizationSetting.create>[0]["data"]["value"] },
    update: { value: value as Parameters<typeof prisma.organizationSetting.update>[0]["data"]["value"] },
  })
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[settings/payments]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
