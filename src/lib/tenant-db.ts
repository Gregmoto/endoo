/**
 * Endoo — Tenant-scoped Prisma client
 *
 * Returns a Prisma client extended with query middleware that:
 *   1. Injects organizationId on every CREATE
 *   2. Filters organizationId on every READ (findMany, findFirst)
 *   3. Enforces organizationId on UPDATE / DELETE (prevents cross-tenant writes)
 *
 * Usage (in Route Handlers / Server Actions):
 *   const ctx   = await requireAuth()
 *   const db    = tenantDb(ctx)
 *   const items = await db.invoice.findMany()          // auto-filtered
 *   const inv   = await db.invoice.create({ data: { ... } }) // org injected
 *
 * Models NOT tenant-scoped (no organizationId): users, user_accounts,
 * sessions, verification_tokens — use the raw `prisma` client for those.
 *
 * IMPORTANT: This is the APPLICATION-LAYER defence.
 * PostgreSQL RLS is the DATABASE-LAYER defence (belt + suspenders).
 */

import { prisma } from "@/lib/prisma"
import type { RBACContext } from "@/lib/rbac/context"
import type { Prisma } from "@prisma/client"

// ─────────────────────────────────────────────
// Models that carry organizationId
// ─────────────────────────────────────────────

const TENANT_MODELS = new Set([
  "contact",
  "product",
  "invoice",
  "invoiceLineItem",
  "payment",
  "recurringSchedule",
  "organizationMember",
  "invitation",
  "agencyStaffAccess",
  "organizationSetting",
  "auditLog",
  "subscription",
] as const)

type TenantModel = typeof TENANT_MODELS extends Set<infer T> ? T : never

// ─────────────────────────────────────────────
// tenantDb — creates an org-scoped Prisma client
// ─────────────────────────────────────────────

export function tenantDb(ctx: RBACContext) {
  const orgId = ctx.organizationId

  return prisma.$extends({
    query: {
      $allModels: {
        // ── findMany ──────────────────────────────────────────────────
        async findMany({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = withOrgFilter(args.where, orgId)
          }
          return query(args)
        },

        // ── findFirst ─────────────────────────────────────────────────
        async findFirst({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = withOrgFilter(args.where, orgId)
          }
          return query(args)
        },

        // ── findFirstOrThrow ──────────────────────────────────────────
        async findFirstOrThrow({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = withOrgFilter(args.where, orgId)
          }
          return query(args)
        },

        // ── findUnique ────────────────────────────────────────────────
        // findUnique uses compound keys, so we can't simply inject a where.
        // Instead we post-validate that the returned record belongs to the org.
        async findUnique({ model, args, query }) {
          const result = await query(args)
          if (isTenantModel(model) && result) {
            assertBelongsToOrg(result as { organizationId?: string }, orgId, model)
          }
          return result
        },

        // ── findUniqueOrThrow ─────────────────────────────────────────
        async findUniqueOrThrow({ model, args, query }) {
          const result = await query(args)
          if (isTenantModel(model)) {
            assertBelongsToOrg(result as { organizationId?: string }, orgId, model)
          }
          return result
        },

        // ── create ────────────────────────────────────────────────────
        async create({ model, args, query }) {
          if (isTenantModel(model)) {
            args.data = { ...args.data, organizationId: orgId }
          }
          return query(args)
        },

        // ── createMany ────────────────────────────────────────────────
        async createMany({ model, args, query }) {
          if (isTenantModel(model)) {
            const data = Array.isArray(args.data) ? args.data : [args.data]
            args.data = data.map((row) => ({ ...row, organizationId: orgId }))
          }
          return query(args)
        },

        // ── update ────────────────────────────────────────────────────
        async update({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = withOrgFilter(args.where, orgId)
          }
          return query(args)
        },

        // ── updateMany ────────────────────────────────────────────────
        async updateMany({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = withOrgFilter(args.where, orgId)
          }
          return query(args)
        },

        // ── delete ────────────────────────────────────────────────────
        async delete({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = withOrgFilter(args.where, orgId)
          }
          return query(args)
        },

        // ── deleteMany ────────────────────────────────────────────────
        async deleteMany({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = withOrgFilter(args.where, orgId)
          }
          return query(args)
        },
      },
    },
  })
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isTenantModel(model: string): model is TenantModel {
  return TENANT_MODELS.has(model.charAt(0).toLowerCase() + model.slice(1) as TenantModel)
}

function withOrgFilter(
  where: Record<string, unknown> | undefined,
  orgId: string
): Record<string, unknown> {
  return { ...where, organizationId: orgId }
}

function assertBelongsToOrg(
  record: { organizationId?: string },
  orgId: string,
  model: string
): void {
  if (record.organizationId && record.organizationId !== orgId) {
    // This should never happen with correct application code.
    // If it does, it indicates a logic bug — throw loudly.
    throw new Error(
      `[tenantDb] Cross-tenant data access detected on model "${model}". ` +
      `Expected org ${orgId}, got ${record.organizationId}`
    )
  }
}

// ─────────────────────────────────────────────
// auditLog helper — always writes to the active org
// Separated for clarity; called throughout the app.
// ─────────────────────────────────────────────

type AuditAction =
  | "create" | "update" | "delete"
  | "login" | "logout"
  | "impersonate_start" | "impersonate_end"
  | "invite_send" | "invite_accept"
  | "plan_change" | "payment_record"
  | "invoice_send" | "invoice_void"
  | "account_switch"

interface AuditParams {
  ctx: RBACContext
  action: AuditAction
  entityType?: string
  entityId?: string
  before?: unknown
  after?: unknown
  meta?: Record<string, unknown>
  ipAddress?: string
}

export async function writeAuditLog({
  ctx,
  action,
  entityType,
  entityId,
  before,
  after,
  meta = {},
  ipAddress,
}: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      before: before ? (before as Prisma.InputJsonValue) : undefined,
      after: after ? (after as Prisma.InputJsonValue) : undefined,
      meta: meta as Prisma.InputJsonValue,
      ipAddress: ipAddress ?? null,
    },
  })
}
