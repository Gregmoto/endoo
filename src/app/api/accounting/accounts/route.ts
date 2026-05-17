import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import {
  getAccounts,
  getChartOfAccounts,
  createAccount,
  seedBasAccounts,
  CreateAccountSchema,
  AccountNumberConflictError,
  type AccountFilter,
} from "@/lib/accounting/accounts"
import { prisma } from "@/lib/prisma"

// GET /api/accounting/accounts
// Query params:
//   type=asset|liability|equity|income|expense
//   reportClass=balance_sheet|income_statement
//   isActive=true|false     (default: true)
//   level=1|2|3             (default: all)
//   search=string           (account number prefix or name substring)
//   grouped=true            (returns ChartSection[] instead of Account[])
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.READ)

    const { searchParams } = new URL(req.url)

    const grouped = searchParams.get("grouped") === "true"
    const includeInactive = searchParams.get("isActive") === "false"

    if (grouped) {
      const sections = await getChartOfAccounts(ctx.organizationId, includeInactive)
      return Response.json({ sections })
    }

    const filter: AccountFilter = {}
    const type = searchParams.get("type")
    if (type) filter.type = type as AccountFilter["type"]

    const reportClass = searchParams.get("reportClass")
    if (reportClass) filter.reportClass = reportClass as AccountFilter["reportClass"]

    if (searchParams.has("isActive")) {
      filter.isActive = searchParams.get("isActive") !== "false"
    } else {
      filter.isActive = true  // default: only active accounts
    }

    const level = searchParams.get("level")
    if (level) filter.level = parseInt(level) as 1 | 2 | 3

    const search = searchParams.get("search")
    if (search) filter.search = search

    const vatCode = searchParams.get("vatCode")
    if (vatCode) filter.vatCode = vatCode

    const accounts = await getAccounts(ctx.organizationId, filter)
    return Response.json({ accounts, total: accounts.length })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (err instanceof Error && err.message === "Unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[GET /api/accounting/accounts]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/accounting/accounts
// Creates a custom account for the organization.
// Body: CreateAccountInput
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.MANAGE_ACCOUNTS)

    const body = await req.json()
    const parsed = CreateAccountSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const account = await createAccount(ctx.organizationId, parsed.data)

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "Account",
        entityId:       account.id,
        meta:           { number: account.number, name: account.name },
      },
    }).catch(() => {})

    return Response.json({ account }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (err instanceof Error && err.message === "Unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err instanceof AccountNumberConflictError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    console.error("[POST /api/accounting/accounts]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
