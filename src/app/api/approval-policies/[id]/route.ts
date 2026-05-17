/**
 * GET    /api/approval-policies/[id]  — fetch single policy with steps
 * PATCH  /api/approval-policies/[id]  — update policy (name, isDefault, autoApproveBelow, steps)
 * DELETE /api/approval-policies/[id]  — soft delete (set isActive = false)
 *
 * Permission: supplier_invoices:manage_approvals
 *
 * PATCH replaces all steps atomically when a "steps" array is provided.
 * Omit "steps" to update only policy-level fields.
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.MANAGE_APPROVALS)

    const { id } = await params

    const policy = await prisma.approvalPolicy.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })
    if (!policy) {
      return Response.json({ error: "Policy hittades inte" }, { status: 404 })
    }

    return Response.json({ policy: serializeBigInts(policy) })
  } catch (err) {
    return handleError(err)
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.MANAGE_APPROVALS)

    const { id } = await params

    const existing = await prisma.approvalPolicy.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!existing) {
      return Response.json({ error: "Policy hittades inte" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))

    const hasSteps = Array.isArray(body.steps)
    const isDefault: boolean | undefined =
      typeof body.isDefault === "boolean" ? body.isDefault : undefined
    const autoApproveBelowSek: number | null | undefined =
      typeof body.autoApproveBelow === "number"
        ? body.autoApproveBelow
        : body.autoApproveBelow === null
        ? null
        : undefined
    const autoApproveBelow: bigint | null | undefined =
      autoApproveBelowSek === null
        ? null
        : autoApproveBelowSek !== undefined
        ? BigInt(Math.round(autoApproveBelowSek * 100))
        : undefined

    if (hasSteps) {
      const stepsInput: Array<{
        stepOrder: number
        name: string
        approverType: string
        specificUserId?: string
        approverRole?: string
        completionRule?: string
        amountMin?: number
        amountMax?: number
      }> = body.steps

      for (const step of stepsInput) {
        if (!step.stepOrder || !step.name || !step.approverType) {
          return Response.json(
            { error: "Varje steg måste ha stepOrder, name och approverType" },
            { status: 400 },
          )
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (isDefault === true) {
          await tx.approvalPolicy.updateMany({
            where: { organizationId: ctx.organizationId, isDefault: true, id: { not: id } },
            data: { isDefault: false },
          })
        }

        await tx.approvalPolicyStep.deleteMany({ where: { policyId: id } })

        return tx.approvalPolicy.update({
          where: { id },
          data: {
            name: typeof body.name === "string" ? body.name : undefined,
            description: typeof body.description === "string" ? body.description : undefined,
            isDefault,
            autoApproveBelow,
            steps: {
              create: stepsInput.map((s) => ({
                stepOrder: s.stepOrder,
                name: s.name,
                approverType: s.approverType as "specific_user" | "role_based",
                specificUserId: s.specificUserId ?? null,
                approverRole: (s.approverRole as "owner" | "admin" | "member" | "viewer") ?? null,
                completionRule: (s.completionRule as "any_one" | "all_must") ?? "any_one",
                amountMin: typeof s.amountMin === "number" ? BigInt(Math.round(s.amountMin * 100)) : null,
                amountMax: typeof s.amountMax === "number" ? BigInt(Math.round(s.amountMax * 100)) : null,
              })),
            },
          },
          include: { steps: { orderBy: { stepOrder: "asc" } } },
        })
      })

      prisma.auditLog.create({
        data: {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: "update",
          entityType: "ApprovalPolicy",
          entityId: id,
          after: { name: updated.name, isDefault: updated.isDefault },
        },
      }).catch(() => {})

      return Response.json({ policy: serializeBigInts(updated) })
    }

    // No steps replacement — update policy-level fields only
    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.approvalPolicy.updateMany({
          where: { organizationId: ctx.organizationId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }

      return tx.approvalPolicy.update({
        where: { id },
        data: {
          name: typeof body.name === "string" ? body.name : undefined,
          description: typeof body.description === "string" ? body.description : undefined,
          isDefault,
          autoApproveBelow,
        },
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      })
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "update",
        entityType: "ApprovalPolicy",
        entityId: id,
        after: { name: updated.name, isDefault: updated.isDefault },
      },
    }).catch(() => {})

    return Response.json({ policy: serializeBigInts(updated) })
  } catch (err) {
    return handleError(err)
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.MANAGE_APPROVALS)

    const { id } = await params

    const existing = await prisma.approvalPolicy.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!existing) {
      return Response.json({ error: "Policy hittades inte" }, { status: 404 })
    }

    await prisma.approvalPolicy.update({
      where: { id },
      data: { isActive: false, isDefault: false },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "delete",
        entityType: "ApprovalPolicy",
        entityId: id,
        after: { soft: true },
      },
    }).catch(() => {})

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}

// ── Serialization + error handler ─────────────────────────────────────────────

function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "bigint") return obj.toString()
  if (Array.isArray(obj)) return obj.map(serializeBigInts)
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeBigInts(v)]),
    )
  }
  return obj
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[approval-policies/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
