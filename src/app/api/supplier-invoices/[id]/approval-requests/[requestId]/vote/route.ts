/**
 * POST /api/supplier-invoices/[id]/approval-requests/[requestId]/vote
 *
 * Cast an approval or rejection vote on the active step of a request.
 * Body: { decision: "approved" | "rejected", comment?: string, actingForUserId?: string }
 * Permission: supplier_invoices:attest
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma } from "@/lib/prisma"
import {
  castVote,
  ApprovalRequestNotFoundError,
  NotAnApproverError,
  StepNotActiveError,
  AlreadyVotedError,
} from "@/services/approval/engine"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.ATTEST)

    const { id: invoiceId, requestId } = await params

    const body = await req.json().catch(() => null)
    if (!body || !body.decision) {
      return Response.json(
        { error: "Fält saknas: decision (approved | rejected)" },
        { status: 400 },
      )
    }

    const decision: string = body.decision
    if (decision !== "approved" && decision !== "rejected") {
      return Response.json(
        { error: "decision måste vara 'approved' eller 'rejected'" },
        { status: 400 },
      )
    }

    const comment: string | null = typeof body.comment === "string" ? body.comment : null
    const actingForUserId: string | null =
      typeof body.actingForUserId === "string" ? body.actingForUserId : null

    const request = await prisma.approvalRequest.findFirst({
      where: {
        id: requestId,
        organizationId: ctx.organizationId,
        supplierInvoiceId: invoiceId,
      },
      include: {
        steps: { where: { status: "active" }, take: 1 },
      },
    })
    if (!request) {
      return Response.json({ error: "Godkännandebegäran hittades inte" }, { status: 404 })
    }

    const activeStep = request.steps[0]
    if (!activeStep) {
      return Response.json({ error: "Inget aktivt steg hittades" }, { status: 409 })
    }

    const result = await castVote(
      ctx.organizationId,
      requestId,
      activeStep.id,
      ctx.userId,
      decision,
      comment,
      actingForUserId,
    )

    return Response.json({
      request: serializeBigInts(result.request),
      stepCompleted: result.stepCompleted,
    })
  } catch (err) {
    if (err instanceof ApprovalRequestNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof NotAnApproverError) {
      return Response.json({ error: err.message }, { status: 403 })
    }
    if (err instanceof StepNotActiveError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof AlreadyVotedError) {
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
  console.error("[approval-vote]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
