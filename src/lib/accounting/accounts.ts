/**
 * Chart of accounts — business logic
 *
 * Responsibilities:
 *   - Seed BAS standard accounts for a new organization
 *   - List accounts with filtering
 *   - Create custom accounts
 *   - Update account metadata (system account restrictions enforced here)
 *   - Deactivate accounts without breaking history
 */

import { prisma } from "@/lib/prisma"
import { BAS_ACCOUNTS } from "./bas-seed"
import type { Account, AccountType, Prisma } from "@prisma/client"
import { z } from "zod"

// ─── Validation schemas ───────────────────────────────────────────────────────

export const CreateAccountSchema = z.object({
  number:          z.string().min(1).max(10).regex(/^\d+$/, "Account number must be numeric"),
  name:            z.string().min(1).max(200),
  type:            z.enum(["asset", "liability", "equity", "income", "expense"]),
  normalSide:      z.enum(["debit", "credit"]),
  reportClass:     z.enum(["balance_sheet", "income_statement"]),
  reportSection:   z.string().max(100).optional(),
  reportSubsection: z.string().max(100).optional(),
  vatCode:         z.string().max(10).optional().nullable(),
  parentNumber:    z.string().max(10).optional().nullable(),
  description:     z.string().max(500).optional().nullable(),
  notes:           z.string().max(1000).optional().nullable(),
  allowManualEntry: z.boolean().optional(),
})

export const UpdateAccountSchema = z.object({
  name:            z.string().min(1).max(200).optional(),
  description:     z.string().max(500).optional().nullable(),
  notes:           z.string().max(1000).optional().nullable(),
  vatCode:         z.string().max(10).optional().nullable(),
  reportSection:   z.string().max(100).optional().nullable(),
  reportSubsection: z.string().max(100).optional().nullable(),
  // These fields are blocked for system accounts (enforced in updateAccount())
  parentNumber:    z.string().max(10).optional().nullable(),
  allowManualEntry: z.boolean().optional(),
})

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>

// ─── Error types ─────────────────────────────────────────────────────────────

export class AccountNotFoundError extends Error {
  constructor(id: string) { super(`Account not found: ${id}`) }
}

export class AccountNumberConflictError extends Error {
  constructor(number: string) { super(`Account number already exists: ${number}`) }
}

export class SystemAccountProtectedError extends Error {
  constructor(field: string) { super(`Cannot change ${field} on a system (BAS standard) account`) }
}

export class AccountHasEntriesError extends Error {
  constructor() { super("Cannot change account type or number — account has posted journal entries") }
}

export class AccountAlreadyActiveError extends Error {
  constructor() { super("Account is already active") }
}

// ─── seedBasAccounts ──────────────────────────────────────────────────────────

/**
 * Seeds the full BAS 2024 standard chart of accounts for a new organization.
 * Idempotent — safe to call multiple times (upserts on organizationId + number).
 *
 * Called from the onboarding route after organization creation.
 */
export async function seedBasAccounts(organizationId: string): Promise<number> {
  const data: Prisma.AccountCreateManyInput[] = BAS_ACCOUNTS.map(account => ({
    organizationId,
    number:          account.number,
    name:            account.name,
    type:            account.type,
    normalSide:      account.normalSide,
    reportClass:     account.reportClass,
    reportSection:   account.reportSection,
    reportSubsection: account.reportSubsection ?? null,
    vatCode:         account.vatCode ?? null,
    parentNumber:    account.parentNumber ?? null,
    level:           account.level,
    sortOrder:       account.sortOrder,
    basNumber:       account.number,   // original BAS number
    isSystem:        true,
    isActive:        true,
    allowManualEntry: account.allowManualEntry,
    description:     account.description ?? null,
  }))

  const result = await prisma.account.createMany({
    data,
    skipDuplicates: true,  // idempotent: existing accounts are not overwritten
  })

  return result.count
}

// ─── getAccounts ──────────────────────────────────────────────────────────────

export type AccountFilter = {
  type?:            AccountType
  reportClass?:     "balance_sheet" | "income_statement"
  isActive?:        boolean
  isSystem?:        boolean
  level?:           1 | 2 | 3
  search?:          string    // matches number prefix or name substring
  parentNumber?:    string
  vatCode?:         string
}

export async function getAccounts(
  organizationId: string,
  filter: AccountFilter = {}
): Promise<Account[]> {
  const where: Prisma.AccountWhereInput = {
    organizationId,
    ...(filter.type        !== undefined && { type: filter.type }),
    ...(filter.reportClass !== undefined && { reportClass: filter.reportClass }),
    ...(filter.isActive    !== undefined && { isActive: filter.isActive }),
    ...(filter.isSystem    !== undefined && { isSystem: filter.isSystem }),
    ...(filter.level       !== undefined && { level: filter.level }),
    ...(filter.parentNumber !== undefined && { parentNumber: filter.parentNumber }),
    ...(filter.vatCode     !== undefined && { vatCode: filter.vatCode }),
    ...(filter.search && {
      OR: [
        { number: { startsWith: filter.search } },
        { name:   { contains: filter.search, mode: "insensitive" } },
      ],
    }),
  }

  return prisma.account.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  })
}

// ─── getAccountByNumber ───────────────────────────────────────────────────────

export async function getAccountByNumber(
  organizationId: string,
  number: string
): Promise<Account | null> {
  return prisma.account.findUnique({
    where: { organizationId_number: { organizationId, number } },
  })
}

// ─── getAccountById ───────────────────────────────────────────────────────────

export async function getAccountById(
  organizationId: string,
  id: string
): Promise<Account> {
  const account = await prisma.account.findFirst({
    where: { id, organizationId },
  })
  if (!account) throw new AccountNotFoundError(id)
  return account
}

// ─── createAccount ────────────────────────────────────────────────────────────

/**
 * Creates a custom (non-system) account for an organization.
 * Account number must be unique within the organization.
 * normalSide is validated against type if not provided:
 *   asset/expense → debit, liability/equity/income → credit
 */
export async function createAccount(
  organizationId: string,
  input: CreateAccountInput
): Promise<Account> {
  // Check for number conflict
  const existing = await prisma.account.findUnique({
    where: { organizationId_number: { organizationId, number: input.number } },
  })
  if (existing) throw new AccountNumberConflictError(input.number)

  // Derive normalSide from type if not provided
  const normalSide = input.normalSide ?? deriveNormalSide(input.type)

  return prisma.account.create({
    data: {
      organizationId,
      number:          input.number,
      name:            input.name,
      type:            input.type,
      normalSide,
      reportClass:     input.reportClass,
      reportSection:   input.reportSection ?? null,
      reportSubsection: input.reportSubsection ?? null,
      vatCode:         input.vatCode ?? null,
      parentNumber:    input.parentNumber ?? null,
      level:           3,
      sortOrder:       parseInt(input.number, 10),
      basNumber:       null,     // custom accounts have no BAS reference
      isSystem:        false,
      isActive:        true,
      allowManualEntry: input.allowManualEntry ?? true,
      description:     input.description ?? null,
      notes:           null,
    },
  })
}

// ─── updateAccount ────────────────────────────────────────────────────────────

/**
 * Updates an account's metadata.
 *
 * Rules:
 *   - System accounts: only name, description, notes, and vatCode are editable
 *   - All accounts: number, type, normalSide, and reportClass are immutable once
 *     the account has any posted journal entries
 *   - parentNumber and allowManualEntry are editable only on custom accounts
 */
export async function updateAccount(
  organizationId: string,
  id: string,
  input: UpdateAccountInput
): Promise<Account> {
  const account = await getAccountById(organizationId, id)

  // System accounts: block structural field changes
  if (account.isSystem) {
    const blockedFields: (keyof UpdateAccountInput)[] = ["parentNumber", "allowManualEntry"]
    for (const field of blockedFields) {
      if (input[field] !== undefined) {
        throw new SystemAccountProtectedError(field)
      }
    }
  }

  return prisma.account.update({
    where: { id },
    data: {
      ...(input.name            !== undefined && { name: input.name }),
      ...(input.description     !== undefined && { description: input.description }),
      ...(input.notes           !== undefined && { notes: input.notes }),
      ...(input.vatCode         !== undefined && { vatCode: input.vatCode }),
      ...(input.reportSection   !== undefined && { reportSection: input.reportSection }),
      ...(input.reportSubsection !== undefined && { reportSubsection: input.reportSubsection }),
      ...(!account.isSystem && input.parentNumber     !== undefined && { parentNumber: input.parentNumber }),
      ...(!account.isSystem && input.allowManualEntry !== undefined && { allowManualEntry: input.allowManualEntry }),
    },
  })
}

// ─── deactivateAccount ────────────────────────────────────────────────────────

/**
 * Soft-disables an account — sets isActive=false.
 *
 * Deactivated accounts:
 *   - Cannot receive new journal entries (enforced in journal creation)
 *   - Remain visible in reports for historical periods
 *   - Can be reactivated at any time
 *   - Are shown in the UI with a visual "inaktiv" indicator
 *
 * System accounts can be deactivated if the organization doesn't use them.
 */
export async function deactivateAccount(
  organizationId: string,
  id: string
): Promise<Account> {
  const account = await getAccountById(organizationId, id)

  return prisma.account.update({
    where: { id },
    data:  { isActive: false },
  })
}

// ─── reactivateAccount ────────────────────────────────────────────────────────

export async function reactivateAccount(
  organizationId: string,
  id: string
): Promise<Account> {
  await getAccountById(organizationId, id)

  return prisma.account.update({
    where: { id },
    data:  { isActive: true },
  })
}

// ─── getChartOfAccounts ───────────────────────────────────────────────────────

/**
 * Returns accounts grouped for report display:
 *   - Balance sheet: assets | liabilities | equity
 *   - Income statement: income | expenses (grouped by class/section)
 *
 * Only returns level=3 accounts (actual bookkeeping accounts, not headings).
 */
export type ChartSection = {
  reportSection: string
  type:          AccountType
  accounts:      Account[]
}

export async function getChartOfAccounts(
  organizationId: string,
  includeInactive = false
): Promise<ChartSection[]> {
  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      level: 3,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { sortOrder: "asc" },
  })

  // Group by reportSection + type
  const sectionMap = new Map<string, ChartSection>()
  for (const account of accounts) {
    const key = `${account.reportSection ?? "Övrigt"}_${account.type}`
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        reportSection: account.reportSection ?? "Övrigt",
        type:          account.type,
        accounts:      [],
      })
    }
    sectionMap.get(key)!.accounts.push(account)
  }

  return Array.from(sectionMap.values())
}

// ─── VAT account lookup ───────────────────────────────────────────────────────

/**
 * Returns the correct VAT liability account number for a given tax rate.
 * Used by the auto-booking engine when building invoice journals.
 *
 *   0.25 → "2610"
 *   0.12 → "2611"
 *   0.06 → "2612"
 *   0    → null (no VAT posting)
 */
export function getVatAccountNumber(taxRate: number): string | null {
  if (taxRate === 0.25) return "2610"
  if (taxRate === 0.12) return "2611"
  if (taxRate === 0.06) return "2612"
  return null
}

/**
 * Returns the correct income account number for a given tax rate.
 * Default mapping — can be overridden at product level (future feature).
 *
 *   0.25 → "3001"  Tjänster 25%
 *   0.12 → "3051"  Tjänster 12%
 *   0.06 → "3101"  Tjänster 6%
 *   0    → "3001"  (momsfri, same account)
 */
export function getDefaultIncomeAccountNumber(taxRate: number): string {
  if (taxRate === 0.12) return "3051"
  if (taxRate === 0.06) return "3101"
  return "3001"
}

/**
 * Returns the correct VAT code string for a given tax rate.
 * Used on JournalEntry.vatCode for momsdeklaration.
 */
export function getVatCode(taxRate: number): string {
  if (taxRate === 0.25) return "MP1"
  if (taxRate === 0.12) return "MP2"
  if (taxRate === 0.06) return "MP3"
  return "MF"
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function deriveNormalSide(type: AccountType): "debit" | "credit" {
  return type === "asset" || type === "expense" ? "debit" : "credit"
}
