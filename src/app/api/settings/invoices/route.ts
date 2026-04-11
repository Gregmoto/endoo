/**
 * GET  /api/settings/invoices  — fetch invoice defaults for the active org
 * PATCH /api/settings/invoices  — update invoice defaults
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SETTING_KEYS } from "@/lib/settings/keys"
import { z } from "zod"

const ORG_SELECT = {
  invoicePrefix:          true,
  invoiceSequenceStart:   true,
  defaultPaymentTermsDays:true,
  defaultTaxRate:         true,
  defaultCurrency:        true,
} as const

const SETTING_KEYS_LIST = [
  SETTING_KEYS.INVOICE_PRICES_INCLUDE_TAX,
  SETTING_KEYS.INVOICE_ROUNDING_MODE,
  SETTING_KEYS.INVOICE_DEFAULT_NOTES,
  SETTING_KEYS.INVOICE_DEFAULT_FOOTER,
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
      defaultTaxRate: Number(org.defaultTaxRate),
      pricesIncludeTax: settingsMap[SETTING_KEYS.INVOICE_PRICES_INCLUDE_TAX] ?? false,
      roundingMode:     settingsMap[SETTING_KEYS.INVOICE_ROUNDING_MODE]      ?? "none",
      defaultNotes:     settingsMap[SETTING_KEYS.INVOICE_DEFAULT_NOTES]      ?? "",
      defaultFooter:    settingsMap[SETTING_KEYS.INVOICE_DEFAULT_FOOTER]     ?? "",
    })
  } catch (err) {
    return handleError(err)
  }
}

const PatchSchema = z.object({
  invoicePrefix:           z.string().max(20).optional(),
  invoiceSequenceStart:    z.number().int().min(1).optional(),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
  defaultTaxRate:          z.number().min(0).max(1).optional(),
  defaultCurrency:         z.enum(["SEK", "EUR", "USD", "NOK", "DKK", "GBP"]).optional(),
  pricesIncludeTax:        z.boolean().optional(),
  roundingMode:            z.enum(["none", "nearest", "up", "down"]).optional(),
  defaultNotes:            z.string().max(2000).optional(),
  defaultFooter:           z.string().max(500).optional(),
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

    const { pricesIncludeTax, roundingMode, defaultNotes, defaultFooter, ...orgFields } = parsed.data

    const settingUpserts: Promise<unknown>[] = []

    if (pricesIncludeTax !== undefined) {
      settingUpserts.push(upsertSetting(ctx.organizationId, SETTING_KEYS.INVOICE_PRICES_INCLUDE_TAX, pricesIncludeTax))
    }
    if (roundingMode !== undefined) {
      settingUpserts.push(upsertSetting(ctx.organizationId, SETTING_KEYS.INVOICE_ROUNDING_MODE, roundingMode))
    }
    if (defaultNotes !== undefined) {
      settingUpserts.push(upsertSetting(ctx.organizationId, SETTING_KEYS.INVOICE_DEFAULT_NOTES, defaultNotes))
    }
    if (defaultFooter !== undefined) {
      settingUpserts.push(upsertSetting(ctx.organizationId, SETTING_KEYS.INVOICE_DEFAULT_FOOTER, defaultFooter))
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
  console.error("[settings/invoices]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
