/**
 * Endoo Approval Engine
 *
 * Manages the full lifecycle of supplier-invoice approval requests:
 *   submitForApproval  — resolves policy, creates request + steps, activates step 1
 *   castVote           — records a vote, evaluates step completion, advances or closes
 *   withdrawRequest    — cancels an in-progress request
 *
 * All state transitions run inside prisma.$transaction.
 * Notifications are fire-and-forget after the transaction commits.
 */

import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type {
  ApprovalRequest,
  ApprovalStep,
  ApprovalPolicyStep,
  SupplierInvoice,
} from "@prisma/client"

import {
  notifyStepApprovers,
  notifyRequestOutcome,
} from "./notifications"

// ─────────────────────────────────────────────
// Domain errors
// ─────────────────────────────────────────────

export class ApprovalPolicyNotFoundError extends Error {
  constructor() {
    super("No active approval policy found for this organization")
    this.name = "ApprovalPolicyNotFoundError"
  }
}

export class InvoiceAlreadyInApprovalError extends Error {
  constructor() {
    super("This invoice already has an in-progress approval request")
    this.name = "InvoiceAlreadyInApprovalError"
  }
}

export class ApprovalRequestNotFoundError extends Error {
  constructor() {
    super("Approval request not found")
    this.name = "ApprovalRequestNotFoundError"
  }
}

export class NotAnApproverError extends Error {
  constructor() {
    super("You are not listed as an approver for this step")
    this.name = "NotAnApproverError"
  }
}

export class StepNotActiveError extends Error {
  constructor() {
    super("This step is not currently active")
    this.name = "StepNotActiveError"
  }
}

export class AlreadyVotedError extends Error {
  constructor() {
    super("You have already cast a vote on this step")
    this.name = "AlreadyVotedError"
  }
}

export class CannotWithdrawError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = "CannotWithdrawError"
  }
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function computeDocumentHash(invoice: Pick<SupplierInvoice, "fileKey" | "fileName">): string {
  return crypto
    .createHash("sha256")
    .update(`${invoice.fileKey}:${invoice.fileName}`)
    .digest("hex")
}

async function resolvePolicy(organizationId: string) {
  return prisma.approvalPolicy.findFirst({
    where: { organizationId, isDefault: true, isActive: true },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  })
}

async function resolveApprovers(
  organizationId: string,
  step: ApprovalPolicyStep,
): Promise<string[]> {
  if (step.approverType === "specific_user") {
    return step.specificUserId ? [step.specificUserId] : []
  }
  if (!step.approverRole) return []

  const members = await prisma.organizationMember.findMany({
    where: { organizationId, role: step.approverRole, deletedAt: null },
    select: { userId: true },
  })
  return members.map((m) => m.userId)
}

function evaluateStepCompletion(
  resolvedApproverIds: string[],
  votes: Array<{ decision: string; voterUserId: string }>,
  rule: string,
): "approved" | "rejected" | "pending" {
  const approvedVotes = votes.filter((v) => v.decision === "approved")
  const rejectedVotes = votes.filter((v) => v.decision === "rejected")

  if (rejectedVotes.length > 0) return "rejected"

  if (rule === "any_one") {
    return approvedVotes.length > 0 ? "approved" : "pending"
  }

  // all_must
  const approvedIds = new Set(approvedVotes.map((v) => v.voterUserId))
  return resolvedApproverIds.every((id) => approvedIds.has(id)) ? "approved" : "pending"
}

// ─────────────────────────────────────────────
// submitForApproval
// ─────────────────────────────────────────────

export async function submitForApproval(
  organizationId: string,
  invoiceId: string,
  submittedByUserId: string,
): Promise<{ autoApproved: boolean; request: ApprovalRequest }> {
  const invoice = await prisma.supplierInvoice.findFirst({
    where: { id: invoiceId, organizationId },
  })
  if (!invoice) throw new ApprovalRequestNotFoundError()

  const existingActive = await prisma.approvalRequest.findFirst({
    where: { supplierInvoiceId: invoiceId, status: "in_progress" },
  })
  if (existingActive) throw new InvoiceAlreadyInApprovalError()

  const policy = await resolvePolicy(organizationId)
  const documentHash = computeDocumentHash(invoice)

  const invoiceAmount = invoice.amountInclVat ?? BigInt(0)
  const autoApproveBelow = policy?.autoApproveBelow ?? null
  const shouldAutoApprove =
    !policy || (autoApproveBelow !== null && invoiceAmount <= autoApproveBelow)

  if (shouldAutoApprove) {
    const request = await prisma.$transaction(async (tx) => {
      const req = await tx.approvalRequest.create({
        data: {
          organizationId,
          supplierInvoiceId: invoiceId,
          policyId: policy?.id ?? null,
          policySnapshot: (policy as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          status: "approved",
          submittedByUserId,
          submittedAt: new Date(),
          completedAt: new Date(),
          documentHash,
        },
      })

      await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: { status: "approved" },
      })

      return req
    })

    prisma.auditLog.create({
      data: {
        organizationId,
        userId: submittedByUserId,
        action: "approval_auto_approved",
        entityType: "ApprovalRequest",
        entityId: request.id,
        after: { invoiceId, reason: policy ? "below_threshold" : "no_policy" },
      },
    }).catch(() => {})

    return { autoApproved: true, request }
  }

  // Resolve approvers for all steps
  const stepsWithApprovers = await Promise.all(
    policy.steps.map(async (step) => {
      const approverIds = await resolveApprovers(organizationId, step)
      return { step, approverIds }
    }),
  )

  const { request, firstStep } = await prisma.$transaction(async (tx) => {
    await tx.supplierInvoice.update({
      where: { id: invoiceId },
      data: { status: "pending_approval" },
    })

    const req = await tx.approvalRequest.create({
      data: {
        organizationId,
        supplierInvoiceId: invoiceId,
        policyId: policy.id,
        policySnapshot: policy as Prisma.InputJsonValue,
        status: "in_progress",
        submittedByUserId,
        submittedAt: new Date(),
        documentHash,
      },
    })

    const createdSteps: ApprovalStep[] = []
    for (const { step, approverIds } of stepsWithApprovers) {
      const created = await tx.approvalStep.create({
        data: {
          organizationId,
          requestId: req.id,
          stepOrder: step.stepOrder,
          name: step.name,
          completionRule: step.completionRule,
          resolvedApproverIds: approverIds,
          status: "pending",
        },
      })
      createdSteps.push(created)
    }

    const [first] = createdSteps.sort((a, b) => a.stepOrder - b.stepOrder)
    const activatedFirst = await tx.approvalStep.update({
      where: { id: first.id },
      data: { status: "active", activatedAt: new Date() },
    })

    return { request: req, firstStep: activatedFirst }
  })

  prisma.auditLog.create({
    data: {
      organizationId,
      userId: submittedByUserId,
      action: "approval_submitted",
      entityType: "ApprovalRequest",
      entityId: request.id,
      after: { invoiceId, policyId: policy.id },
    },
  }).catch(() => {})

  notifyStepApprovers(organizationId, request, firstStep, invoice).catch(() => {})

  return { autoApproved: false, request }
}

// ─────────────────────────────────────────────
// castVote
// ─────────────────────────────────────────────

export async function castVote(
  organizationId: string,
  requestId: string,
  stepId: string,
  voterUserId: string,
  decision: "approved" | "rejected",
  comment: string | null,
  actingForUserId: string | null,
): Promise<{ request: ApprovalRequest; stepCompleted: boolean }> {
  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, organizationId },
    include: {
      supplierInvoice: true,
      steps: { orderBy: { stepOrder: "asc" } },
    },
  })
  if (!request) throw new ApprovalRequestNotFoundError()

  const step = request.steps.find((s) => s.id === stepId)
  if (!step) throw new StepNotActiveError()
  if (step.status !== "active") throw new StepNotActiveError()

  const isDirectApprover = step.resolvedApproverIds.includes(voterUserId)
  let effectiveVoterUserId = voterUserId

  if (!isDirectApprover) {
    if (actingForUserId && step.resolvedApproverIds.includes(actingForUserId)) {
      const actingMembership = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: voterUserId } },
        select: { role: true },
      })
      if (!actingMembership || !["owner", "admin"].includes(actingMembership.role)) {
        throw new NotAnApproverError()
      }
      effectiveVoterUserId = actingForUserId
    } else {
      throw new NotAnApproverError()
    }
  }

  const existingVote = await prisma.approvalVote.findFirst({
    where: { stepId, voterUserId: effectiveVoterUserId },
  })
  if (existingVote) throw new AlreadyVotedError()

  const now = new Date()

  const { updatedRequest, stepCompleted } = await prisma.$transaction(async (tx) => {
    await tx.approvalVote.create({
      data: {
        organizationId,
        stepId,
        voterUserId: effectiveVoterUserId,
        actingForUserId: actingForUserId !== effectiveVoterUserId ? voterUserId : null,
        decision,
        comment,
        votedAt: now,
      },
    })

    const allVotes = await tx.approvalVote.findMany({
      where: { stepId },
      select: { decision: true, voterUserId: true },
    })

    const outcome = evaluateStepCompletion(
      step.resolvedApproverIds,
      allVotes,
      step.completionRule,
    )

    if (outcome === "pending") {
      const unchanged = await tx.approvalRequest.findUniqueOrThrow({ where: { id: requestId } })
      return { updatedRequest: unchanged, stepCompleted: false }
    }

    await tx.approvalStep.update({
      where: { id: stepId },
      data: { status: outcome, completedAt: now },
    })

    if (outcome === "rejected") {
      await tx.approvalStep.updateMany({
        where: { requestId, status: "active", id: { not: stepId } },
        data: { status: "pending" },
      })

      const updatedReq = await tx.approvalRequest.update({
        where: { id: requestId },
        data: { status: "rejected", completedAt: now, rejectionReason: comment },
      })

      await tx.supplierInvoice.update({
        where: { id: request.supplierInvoiceId },
        data: { status: "needs_review" },
      })

      return { updatedRequest: updatedReq, stepCompleted: true }
    }

    // Step approved — find next pending step
    const nextStep = request.steps
      .filter((s) => s.id !== stepId)
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .find((s) => s.status === "pending")

    if (nextStep) {
      await tx.approvalStep.update({
        where: { id: nextStep.id },
        data: { status: "active", activatedAt: now },
      })

      const unchanged = await tx.approvalRequest.findUniqueOrThrow({ where: { id: requestId } })
      return { updatedRequest: unchanged, stepCompleted: true }
    }

    // All steps approved
    const updatedReq = await tx.approvalRequest.update({
      where: { id: requestId },
      data: { status: "approved", completedAt: now },
    })

    await tx.supplierInvoice.update({
      where: { id: request.supplierInvoiceId },
      data: { status: "approved" },
    })

    return { updatedRequest: updatedReq, stepCompleted: true }
  })

  if (updatedRequest.status === "in_progress" && stepCompleted) {
    const freshSteps = await prisma.approvalStep.findMany({
      where: { requestId, status: "active" },
    })
    if (freshSteps.length > 0) {
      notifyStepApprovers(
        organizationId,
        updatedRequest,
        freshSteps[0],
        request.supplierInvoice,
      ).catch(() => {})
    }
  }

  if (updatedRequest.status === "approved" || updatedRequest.status === "rejected") {
    notifyRequestOutcome(organizationId, updatedRequest, request.supplierInvoice).catch(() => {})
  }

  prisma.auditLog.create({
    data: {
      organizationId,
      userId: voterUserId,
      action: "approval_voted",
      entityType: "ApprovalRequest",
      entityId: requestId,
      after: { stepId, decision, effectiveVoterUserId, comment, requestStatus: updatedRequest.status },
    },
  }).catch(() => {})

  return { request: updatedRequest, stepCompleted }
}

// ─────────────────────────────────────────────
// withdrawRequest
// ─────────────────────────────────────────────

export async function withdrawRequest(
  organizationId: string,
  requestId: string,
  withdrawnByUserId: string,
): Promise<ApprovalRequest> {
  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, organizationId },
    include: { supplierInvoice: true },
  })
  if (!request) throw new ApprovalRequestNotFoundError()
  if (request.status !== "in_progress") {
    throw new CannotWithdrawError(`Cannot withdraw a request with status "${request.status}"`)
  }

  const withdrawn = await prisma.$transaction(async (tx) => {
    const updated = await tx.approvalRequest.update({
      where: { id: requestId },
      data: { status: "withdrawn", withdrawnAt: new Date(), withdrawnByUserId },
    })

    await tx.approvalStep.updateMany({
      where: { requestId, status: "active" },
      data: { status: "pending" },
    })

    await tx.supplierInvoice.update({
      where: { id: request.supplierInvoiceId },
      data: { status: "needs_review" },
    })

    return updated
  })

  prisma.auditLog.create({
    data: {
      organizationId,
      userId: withdrawnByUserId,
      action: "approval_withdrawn",
      entityType: "ApprovalRequest",
      entityId: requestId,
      after: { invoiceId: request.supplierInvoiceId },
    },
  }).catch(() => {})

  return withdrawn
}
