/**
 * Account dimension rules — defines which dimension axes are required
 * or allowed for entries on a given account.
 *
 * Used by the posting engine to validate that every required dimension
 * axis has at least one allocation on each journal entry line.
 *
 * Example setup:
 *   account 4xxx → requires "project" axis
 *   account 7xxx → requires "cc" axis
 */

import { prisma } from "@/lib/prisma"
import type { AccountDimensionRule } from "@prisma/client"

// ─── Error ────────────────────────────────────────────────────────────────────

export class MissingRequiredDimensionError extends Error {
  readonly accountNumber: string
  readonly axisCode: string
  constructor(accountNumber: string, axisCode: string) {
    super(`Account ${accountNumber} requires dimension axis "${axisCode}" but no allocation was provided`)
    this.accountNumber = accountNumber
    this.axisCode      = axisCode
    this.name          = "MissingRequiredDimensionError"
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function setAccountDimensionRule(
  organizationId: string,
  accountId:      string,
  axisId:         string,
  isRequired:     boolean,
): Promise<AccountDimensionRule> {
  return prisma.accountDimensionRule.upsert({
    where:  { accountId_axisId: { accountId, axisId } },
    update: { isRequired },
    create: { organizationId, accountId, axisId, isRequired },
  })
}

export async function removeAccountDimensionRule(
  organizationId: string,
  accountId:      string,
  axisId:         string,
): Promise<void> {
  await prisma.accountDimensionRule.deleteMany({
    where: { organizationId, accountId, axisId },
  })
}

export async function getAccountDimensionRules(
  organizationId: string,
  accountId: string,
): Promise<AccountDimensionRule[]> {
  return prisma.accountDimensionRule.findMany({
    where: { organizationId, accountId },
    include: { axis: true },
  })
}

// ─── Validation (called by posting engine) ────────────────────────────────────

/**
 * Validates that all required dimension axes for a given account have
 * at least one allocation in the proposed entry dimensions.
 *
 * @param organizationId  tenant
 * @param accountId       the account being posted to
 * @param axisCodesPresent  set of axis codes that have allocations on this entry
 */
export async function validateRequiredDimensions(
  organizationId:   string,
  accountId:        string,
  axisCodesPresent: Set<string>,
): Promise<void> {
  const rules = await prisma.accountDimensionRule.findMany({
    where:   { organizationId, accountId, isRequired: true },
    include: { axis: { select: { code: true } }, account: { select: { number: true } } },
  })

  for (const rule of rules) {
    if (!axisCodesPresent.has(rule.axis.code)) {
      throw new MissingRequiredDimensionError(rule.account.number, rule.axis.code)
    }
  }
}

/**
 * Batch-loads required axis codes for a set of accountIds.
 * Returns Map<accountId, Set<axisCode>>
 */
export async function loadRequiredAxesBatch(
  organizationId: string,
  accountIds:     string[],
): Promise<Map<string, Set<string>>> {
  if (accountIds.length === 0) return new Map()

  const rules = await prisma.accountDimensionRule.findMany({
    where:   { organizationId, accountId: { in: accountIds }, isRequired: true },
    include: { axis: { select: { code: true } } },
  })

  const result = new Map<string, Set<string>>()
  for (const rule of rules) {
    const existing = result.get(rule.accountId) ?? new Set<string>()
    existing.add(rule.axis.code)
    result.set(rule.accountId, existing)
  }
  return result
}
