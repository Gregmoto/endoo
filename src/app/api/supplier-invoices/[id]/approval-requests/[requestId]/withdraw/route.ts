/**
 * POST /api/supplier-invoices/[id]/approval-requests/[requestId]/withdraw
 *
 * Withdraw an in-progress approval request.
 * Caller must be the original submitter, OR have admin/owner role.
 * Permission: supplier_invoices:review
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"
import {
  withdrawRequest,
  ApprovalRequestNotFoundError,
  CannotWithdrawError,
} from "@/services/approval/engine"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.REVIEW)

    const { id: invoiceId, requestId } = await params

    const request = await prisma.approvalRequest.findFirst({
      where: {
        id: requestId,
        organizationId: ctx.organizationId,
        supplierInvoiceId: invoiceId,
      },
      select: { submittedByUserId: true, status: true },
    })
    if (!request) {
      return Response.json({ error: "Godkännandebegäran hittades inte" }, { status: 404 })
    }

    // Only the submitter or admin/owner may withdraw
    const isSubmitter = request.submittedByUserId === ctx.userId
    const isAdmin = ["super_admin", "agency_owner", "agency_admin", "customer_owner", "customer_admin"].includes(
      ctx.role,
    )
    if (!isSubmitter && !isAdmin) {
      return Response.json(
        { error: "Bara den som lämnade in begäran eller en administratör kan dra tillbaka den" },
        { status: 403 },
      )
    }

    const withdrawn = await withdrawRequest(ctx.organizationId, requestId, ctx.userId)

    return Response.json({ request: serializeBigInts(withdrawn) })
  } catch (err) {
    if (err instanceof ApprovalRequestNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof CannotWithdrawError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
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
  console.error("[approval-withdraw]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
