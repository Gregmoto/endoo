/**
 * GET  /api/approval-policies  — list all policies for the org
 * POST /api/approval-policies  — create a new policy with steps
 *
 * Body for POST:
 * {
 *   name: string
 *   isDefault?: boolean
 *   description?: string
 *   autoApproveBelow?: number         // SEK — converted to öre (× 100)
 *   steps: [{
 *     stepOrder: number
 *     name: string
 *     approverType: "specific_user" | "role_based"
 *     specificUserId?: string
 *     approverRole?: "owner" | "admin" | "member" | "viewer"
 *     completionRule?: "any_one" | "all_must"
 *     amountMin?: number              // SEK → öre
 *     amountMax?: number              // SEK → öre
 *   }]
 * }
 *
 * Permission: supplier_invoices:manage_approvals
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.MANAGE_APPROVALS)

    const policies = await prisma.approvalPolicy.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })

    return Response.json({ policies: serializeBigInts(policies) })
  } catch (err) {
    return handleError(err)
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.MANAGE_APPROVALS)

    const body = await req.json().catch(() => null)
    if (!body?.name) {
      return Response.json({ error: "Fält saknas: name" }, { status: 400 })
    }

    const name: string = body.name
    const isDefault: boolean = body.isDefault === true
    const description: string | null = typeof body.description === "string" ? body.description : null
    const autoApproveBelowSek: number | null =
      typeof body.autoApproveBelow === "number" ? body.autoApproveBelow : null
    const autoApproveBelow: bigint | null =
      autoApproveBelowSek !== null ? BigInt(Math.round(autoApproveBelowSek * 100)) : null

    const stepsInput: Array<{
      stepOrder: number
      name: string
      approverType: string
      specificUserId?: string
      approverRole?: string
      completionRule?: string
      amountMin?: number
      amountMax?: number
    }> = Array.isArray(body.steps) ? body.steps : []

    if (stepsInput.length === 0) {
      return Response.json(
        { error: "Minst ett steg krävs" },
        { status: 400 },
      )
    }

    // Validate step fields
    for (const step of stepsInput) {
      if (!step.stepOrder || !step.name || !step.approverType) {
        return Response.json(
          { error: "Varje steg måste ha stepOrder, name och approverType" },
          { status: 400 },
        )
      }
      if (!["specific_user", "role_based"].includes(step.approverType)) {
        return Response.json(
          { error: `Ogiltigt approverType: ${step.approverType}` },
          { status: 400 },
        )
      }
      if (step.approverType === "specific_user" && !step.specificUserId) {
        return Response.json(
          { error: "specificUserId krävs när approverType är specific_user" },
          { status: 400 },
        )
      }
      if (step.approverType === "role_based" && !step.approverRole) {
        return Response.json(
          { error: "approverRole krävs när approverType är role_based" },
          { status: 400 },
        )
      }
    }

    const policy = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.approvalPolicy.updateMany({
          where: { organizationId: ctx.organizationId, isDefault: true },
          data: { isDefault: false },
        })
      }

      const created = await tx.approvalPolicy.create({
        data: {
          organizationId: ctx.organizationId,
          name,
          description,
          isDefault,
          isActive: true,
          autoApproveBelow,
          createdByUserId: ctx.userId,
          steps: {
            create: stepsInput.map((s) => ({
              stepOrder: s.stepOrder,
              name: s.name,
              approverType: s.approverType as "specific_user" | "role_based",
              specificUserId: s.specificUserId ?? null,
              approverRole: (s.approverRole as "owner" | "admin" | "member" | "viewer") ?? null,
              completionRule: (s.completionRule as "any_one" | "all_must") ?? "any_one",
              amountMin:
                typeof s.amountMin === "number"
                  ? BigInt(Math.round(s.amountMin * 100))
                  : null,
              amountMax:
                typeof s.amountMax === "number"
                  ? BigInt(Math.round(s.amountMax * 100))
                  : null,
            })),
          },
        },
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      })

      return created
    })

    prisma.auditLog
      .create({
        data: {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: "create",
          entityType: "ApprovalPolicy",
          entityId: policy.id,
          after: { name, isDefault },
        },
      })
      .catch(() => {})

    return Response.json({ policy: serializeBigInts(policy) }, { status: 201 })
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
  console.error("[approval-policies]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
