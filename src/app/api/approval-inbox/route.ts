/**
 * GET /api/approval-inbox
 *
 * Returns active ApprovalStep rows where the current user is in
 * resolvedApproverIds and status = "active".
 * Includes joined invoice + supplier data for the inbox view.
 *
 * Permission: supplier_invoices:read
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.READ)

    const steps = await prisma.approvalStep.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: "active",
        resolvedApproverIds: { has: ctx.userId },
      },
      orderBy: { activatedAt: "asc" },
      include: {
        request: {
          include: {
            supplierInvoice: {
              select: {
                id: true,
                supplierName: true,
                invoiceNumber: true,
                invoiceDate: true,
                dueDate: true,
                amountInclVat: true,
                currency: true,
                status: true,
                supplier: { select: { id: true, name: true, orgNumber: true } },
              },
            },
          },
        },
        votes: {
          select: { voterUserId: true, decision: true, comment: true, votedAt: true },
          orderBy: { votedAt: "asc" },
        },
      },
    })

    const enriched = steps.map((step) => {
      const myVote = step.votes.find((v) => v.voterUserId === ctx.userId) ?? null
      return {
        ...(serializeBigInts(step) as object),
        myVote: myVote ? serializeBigInts(myVote) : null,
      }
    })

    return Response.json({ steps: enriched })
  } catch (err) {
    return handleError(err)
  }
}

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
  console.error("[approval-inbox]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
