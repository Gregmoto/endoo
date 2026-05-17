/**
 * Account slot resolver.
 *
 * Maps logical slot names (AR, BANK, VAT_OUT_25, ...) to Account.id
 * for a specific organization. Org-level overrides via OrganizationSetting
 * take precedence over BAS defaults.
 *
 * Resolution order:
 *   org setting "accounting.slot.{SLOT}" → BAS default account number → Account.id
 */

import { prisma }               from "@/lib/prisma"
import { AccountSlotMissingError } from "./errors"
import type { AccountSlotKey, ResolvedSlots } from "./types"

// ─── BAS default account numbers per slot ────────────────────────────────────

export const SLOT_DEFAULTS: Record<AccountSlotKey, string> = {
  AR:         "1510",
  AP:         "2440",
  BANK:       "1930",
  BANK_SWISH: "1920",
  BANK_CASH:  "1910",
  REVENUE_25: "3001",
  REVENUE_12: "3051",
  REVENUE_6:  "3101",
  REVENUE_0:  "3001",
  VAT_OUT_25: "2610",
  VAT_OUT_12: "2611",
  VAT_OUT_6:  "2612",
  VAT_IN:     "2640",
}

const ALL_SLOTS = Object.keys(SLOT_DEFAULTS) as AccountSlotKey[]

// ─── resolveAccountSlots ──────────────────────────────────────────────────────

/**
 * Resolves all accounting slot keys to Account.id for the given org.
 * Throws AccountSlotMissingError if any required account does not exist.
 */
export async function resolveAccountSlots(
  organizationId: string
): Promise<ResolvedSlots> {
  // Load org-level overrides (accounting.slot.* settings)
  const settings = await prisma.organizationSetting.findMany({
    where:  { organizationId, key: { startsWith: "accounting.slot." } },
    select: { key: true, value: true },
  })

  const overrides: Partial<Record<AccountSlotKey, string>> = {}
  for (const s of settings) {
    const slotKey = s.key.replace("accounting.slot.", "") as AccountSlotKey
    if (typeof s.value === "string") overrides[slotKey] = s.value
  }

  // Build slot → account number mapping
  const slotToNumber = {} as Record<AccountSlotKey, string>
  for (const slot of ALL_SLOTS) {
    slotToNumber[slot] = overrides[slot] ?? SLOT_DEFAULTS[slot]
  }

  // Batch lookup all needed account numbers
  const uniqueNumbers = [...new Set(Object.values(slotToNumber))]
  const accounts = await prisma.account.findMany({
    where:  { organizationId, number: { in: uniqueNumbers }, isActive: true },
    select: { id: true, number: true },
  })

  const numberToId = new Map(accounts.map(a => [a.number, a.id]))

  // Resolve each slot to an Account.id
  const result = {} as ResolvedSlots
  for (const slot of ALL_SLOTS) {
    const number = slotToNumber[slot]
    const id     = numberToId.get(number)
    if (!id) throw new AccountSlotMissingError(slot, number)
    result[slot] = id
  }

  return result
}
