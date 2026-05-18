/**
 * GET  /api/settings/account-mappings  — fetch all slot overrides for the org
 * PUT  /api/settings/account-mappings  — save one or more slot overrides
 *
 * Slot overrides are stored in OrganizationSetting with key "accounting.slot.{SLOT}".
 * This endpoint is a convenience wrapper that returns them as a flat object and
 * lets the UI save all at once.
 */

import { requireAuth }          from "@/lib/rbac/guards"
import { canOrThrow }           from "@/lib/rbac/policy"
import { SETTINGS_PERMISSIONS } from "@/lib/rbac/permissions"
import { SLOT_DEFAULTS }        from "@/lib/accounting/posting/account-slots"
import { handleApiError }       from "@/lib/api/handle-error"
import { prisma }               from "@/lib/prisma"
import type { AccountSlotKey }  from "@/lib/accounting/posting/types"
import { z }                    from "zod"

const SLOT_KEYS = Object.keys(SLOT_DEFAULTS) as AccountSlotKey[]

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SETTINGS_PERMISSIONS.READ)

    const settings = await prisma.organizationSetting.findMany({
      where: {
        organizationId: ctx.organizationId,
        key: { startsWith: "accounting.slot." },
      },
      select: { key: true, value: true },
    })

    const overrides: Partial<Record<AccountSlotKey, string>> = {}
    for (const s of settings) {
      const slotKey = s.key.replace("accounting.slot.", "") as AccountSlotKey
      if (typeof s.value === "string") overrides[slotKey] = s.value
    }

    // Return defaults merged with overrides
    const mappings = SLOT_KEYS.reduce((acc, key) => {
      acc[key] = overrides[key] ?? SLOT_DEFAULTS[key]
      return acc
    }, {} as Record<AccountSlotKey, string>)

    return Response.json({ mappings, defaults: SLOT_DEFAULTS })
  } catch (err) {
    return handleApiError(err, "settings/account-mappings")
  }
}

const UpdateSchema = z.record(
  z.string(), // AccountSlotKey
  z.string().min(1).max(10).regex(/^\d+$/, "Kontonummer måste vara numeriskt")
)

export async function PUT(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SETTINGS_PERMISSIONS.UPDATE)

    const body   = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const updates = Object.entries(parsed.data) as [AccountSlotKey, string][]

    // Validate: only known slot keys accepted
    const unknownKeys = updates.filter(([k]) => !SLOT_KEYS.includes(k))
    if (unknownKeys.length) {
      return Response.json(
        { error: `Okänd slot-nyckel: ${unknownKeys.map(([k]) => k).join(", ")}` },
        { status: 400 }
      )
    }

    // Validate: account numbers must exist in this org
    const numbers = updates.map(([, v]) => v)
    const accounts = await prisma.account.findMany({
      where: {
        organizationId: ctx.organizationId,
        number: { in: numbers },
        isActive: true,
      },
      select: { number: true },
    })
    const foundNumbers = new Set(accounts.map(a => a.number))
    const missing = numbers.filter(n => !foundNumbers.has(n))
    if (missing.length) {
      return Response.json(
        { error: `Konto saknas eller är inaktivt: ${missing.join(", ")}` },
        { status: 400 }
      )
    }

    // Upsert each slot
    await Promise.all(
      updates.map(([slotKey, accountNumber]) =>
        prisma.organizationSetting.upsert({
          where: {
            organizationId_key: {
              organizationId: ctx.organizationId,
              key: `accounting.slot.${slotKey}`,
            },
          },
          update: { value: accountNumber, updatedByUserId: ctx.userId },
          create: {
            organizationId: ctx.organizationId,
            key:            `accounting.slot.${slotKey}`,
            value:          accountNumber,
            updatedByUserId: ctx.userId,
          },
        })
      )
    )

    return Response.json({ ok: true, updated: updates.length })
  } catch (err) {
    return handleApiError(err, "settings/account-mappings")
  }
}
