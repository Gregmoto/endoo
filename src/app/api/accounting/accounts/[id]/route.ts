import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import {
  getAccountById,
  updateAccount,
  deactivateAccount,
  reactivateAccount,
  UpdateAccountSchema,
  AccountNotFoundError,
  SystemAccountProtectedError,
} from "@/lib/accounting/accounts"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// GET /api/accounting/accounts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.READ)

    const { id } = await params
    const account = await getAccountById(ctx.organizationId, id)

    return Response.json({ account })
  } catch (err) {
    if (err instanceof AccountNotFoundError) {
      return Response.json({ error: "Account not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (err instanceof Error && err.message === "Unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/accounting/accounts/[id]
// Updates editable fields. Blocked fields on system accounts are rejected with 422.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.MANAGE_ACCOUNTS)

    const { id } = await params
    const body = await req.json()
    const parsed = UpdateAccountSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const before = await getAccountById(ctx.organizationId, id)
    const account = await updateAccount(ctx.organizationId, id, parsed.data)

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Account",
        entityId:       account.id,
        before:         { name: before.name, vatCode: before.vatCode, description: before.description },
        after:          { name: account.name, vatCode: account.vatCode, description: account.description },
        meta:           { number: account.number, isSystem: account.isSystem },
      },
    }).catch(() => {})

    return Response.json({ account })
  } catch (err) {
    if (err instanceof AccountNotFoundError) {
      return Response.json({ error: "Account not found" }, { status: 404 })
    }
    if (err instanceof SystemAccountProtectedError) {
      return Response.json({ error: err.message }, { status: 422 })
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (err instanceof Error && err.message === "Unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[PATCH /api/accounting/accounts/[id]]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/accounting/accounts/[id]
// Soft-deactivates the account (sets isActive=false). Never hard-deletes.
// Use ?reactivate=true to reactivate a previously deactivated account.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.MANAGE_ACCOUNTS)

    const { id } = await params
    const reactivate = new URL(req.url).searchParams.get("reactivate") === "true"

    const account = reactivate
      ? await reactivateAccount(ctx.organizationId, id)
      : await deactivateAccount(ctx.organizationId, id)

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         reactivate ? "update" : "delete",
        entityType:     "Account",
        entityId:       account.id,
        meta:           { number: account.number, isActive: account.isActive, action: reactivate ? "reactivated" : "deactivated" },
      },
    }).catch(() => {})

    return Response.json({ account })
  } catch (err) {
    if (err instanceof AccountNotFoundError) {
      return Response.json({ error: "Account not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (err instanceof Error && err.message === "Unauthenticated") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[DELETE /api/accounting/accounts/[id]]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
