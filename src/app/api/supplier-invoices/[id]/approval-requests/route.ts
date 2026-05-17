/**
 * GET  /api/supplier-invoices/[id]/approval-requests
 *      List all ApprovalRequest rounds for this invoice, with steps + votes.
 *
 * POST /api/supplier-invoices/[id]/approval-requests
 *      Submit invoice for approval.
 *      Permission: supplier_invoices:review
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"
import {
  submitForApproval,
  InvoiceAlreadyInApprovalError,
  ApprovalRequestNotFoundError,
} from "@/services/approval/engine"

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.READ)

    const { id: invoiceId } = await params

    const invoice = await prisma.supplierInvoice.findFirst({
      where: { id: invoiceId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!invoice) {
      return Response.json({ error: "Faktura hittades inte" }, { status: 404 })
    }

    const requests = await prisma.approvalRequest.findMany({
      where: { supplierInvoiceId: invoiceId, organizationId: ctx.organizationId },
      orderBy: { submittedAt: "desc" },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
          include: { votes: { orderBy: { votedAt: "asc" } } },
        },
      },
    })

    return Response.json({ requests: serializeRequests(requests) })
  } catch (err) {
    return handleError(err)
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.REVIEW)

    const { id: invoiceId } = await params

    const result = await submitForApproval(
      ctx.organizationId,
      invoiceId,
      ctx.userId,
    )

    return Response.json(
      {
        autoApproved: result.autoApproved,
        request: serializeBigInts(result.request),
      },
      { status: 201 },
    )
  } catch (err) {
    if (err instanceof InvoiceAlreadyInApprovalError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof ApprovalRequestNotFoundError) {
      return Response.json({ error: "Faktura hittades inte" }, { status: 404 })
    }
    return handleError(err)
  }
}

// ── Serialization ─────────────────────────────────────────────────────────────

function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "bigint") return obj.toString()
  if (Array.isArray(obj)) return obj.map(serializeBigInts)
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        serializeBigInts(v),
      ]),
    )
  }
  return obj
}

function serializeRequests(requests: unknown[]): unknown[] {
  return requests.map(serializeBigInts) as unknown[]
}

// ── Error handler ─────────────────────────────────────────────────────────────

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[approval-requests]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
