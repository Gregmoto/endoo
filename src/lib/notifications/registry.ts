/**
 * Event Registry — single source of truth for every notification event type.
 * Each entry defines: category, defaults, fingerprint strategy, recipient
 * resolver, email template, and activity icon key.
 */

import type {
  EventDefinition,
  InvoicePaidPayload,
  InvoiceOverduePayload,
  ApprovalNeededPayload,
  ApprovalOutcomePayload,
  PaymentRecordedPayload,
  VatPeriodApproachingPayload,
  BaseEventPayload,
} from "./types"
import {
  resolveOrgAdmins,
  resolveOrgAdminsPlusUser,
  resolveExplicitList,
  deduplicateRecipients,
} from "./recipients"

// ─── Registry ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EVENT_REGISTRY: Record<string, EventDefinition<any>> = {

  // ── Invoice ──────────────────────────────────────────────────────────────────

  invoice_paid: {
    category:      "invoices",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "invoice_paid",
    activityIcon:  "invoice_paid",
    fingerprint: (p: InvoicePaidPayload) => ({ kind: "exact", key: `payment:${p.paymentId}` }),
    resolveRecipients: async (orgId, p: InvoicePaidPayload) =>
      deduplicateRecipients(await resolveOrgAdminsPlusUser(orgId, p.createdByUserId)),
  },

  invoice_overdue: {
    category:      "invoices",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "invoice_overdue",
    activityIcon:  "invoice_overdue",
    fingerprint: () => ({ kind: "daily" }),
    resolveRecipients: async (orgId, p: InvoiceOverduePayload) =>
      deduplicateRecipients(await resolveOrgAdminsPlusUser(orgId, p.createdByUserId)),
  },

  invoice_sent: {
    category:      "invoices",
    defaultInApp:  true,
    defaultEmail:  false,
    payloadVersion: 1,
    emailTemplate: null,
    activityIcon:  "invoice_sent",
    fingerprint: (p: BaseEventPayload & { invoiceId: string }) => ({ kind: "exact", key: `sent:${p.invoiceId}` }),
    resolveRecipients: async (orgId, p: { createdByUserId: string }) =>
      deduplicateRecipients(await resolveOrgAdminsPlusUser(orgId, p.createdByUserId)),
  },

  invoice_voided: {
    category:      "invoices",
    defaultInApp:  true,
    defaultEmail:  false,
    payloadVersion: 1,
    emailTemplate: null,
    activityIcon:  "invoice_voided",
    fingerprint: (p: BaseEventPayload & { invoiceId: string }) => ({ kind: "exact", key: `voided:${p.invoiceId}` }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  // ── Payment ───────────────────────────────────────────────────────────────────

  payment_recorded: {
    category:      "payments",
    defaultInApp:  true,
    defaultEmail:  false,
    payloadVersion: 1,
    emailTemplate: null,
    activityIcon:  "payment_recorded",
    fingerprint: (p: PaymentRecordedPayload) => ({ kind: "exact", key: `payment:${p.paymentId}` }),
    resolveRecipients: async (orgId, p: PaymentRecordedPayload) =>
      deduplicateRecipients(await resolveOrgAdminsPlusUser(orgId, p.createdByUserId)),
  },

  // ── Approval ──────────────────────────────────────────────────────────────────

  approval_submitted: {
    category:      "approvals",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "approval_needed",
    activityIcon:  "approval_needed",
    fingerprint: (p: ApprovalNeededPayload) => ({ kind: "exact", key: `request:${p.requestId}` }),
    resolveRecipients: async (_orgId, p: ApprovalNeededPayload) =>
      resolveExplicitList(p.resolvedApproverIds),
  },

  approval_approved: {
    category:      "approvals",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "approval_outcome",
    activityIcon:  "approval_approved",
    fingerprint: (p: ApprovalOutcomePayload) => ({ kind: "exact", key: `approved:${p.requestId}` }),
    resolveRecipients: async (orgId, p: ApprovalOutcomePayload) =>
      deduplicateRecipients(await resolveOrgAdminsPlusUser(orgId, p.submittedByUserId)),
  },

  approval_rejected: {
    category:      "approvals",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "approval_outcome",
    activityIcon:  "approval_rejected",
    fingerprint: (p: ApprovalOutcomePayload) => ({ kind: "exact", key: `rejected:${p.requestId}` }),
    resolveRecipients: async (orgId, p: ApprovalOutcomePayload) =>
      deduplicateRecipients(await resolveOrgAdminsPlusUser(orgId, p.submittedByUserId)),
  },

  approval_vote_cast: {
    category:      "approvals",
    defaultInApp:  true,
    defaultEmail:  false,
    payloadVersion: 1,
    emailTemplate: null,
    activityIcon:  "approval_voted",
    fingerprint: (p: BaseEventPayload & { voteId: string }) => ({ kind: "exact", key: `vote:${p.voteId}` }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  approval_withdrawn: {
    category:      "approvals",
    defaultInApp:  true,
    defaultEmail:  false,
    payloadVersion: 1,
    emailTemplate: null,
    activityIcon:  "approval_withdrawn",
    fingerprint: (p: BaseEventPayload & { requestId: string }) => ({ kind: "exact", key: `withdrawn:${p.requestId}` }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  // ── Accounting ────────────────────────────────────────────────────────────────

  accounting_posting_failed: {
    category:      "accounting",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "generic",
    activityIcon:  "posting_failed",
    fingerprint: () => ({ kind: "hourly" }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  // ── VAT ───────────────────────────────────────────────────────────────────────

  vat_period_approaching: {
    category:      "vat",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "vat_period_approaching",
    activityIcon:  "vat_approaching",
    fingerprint: (p: VatPeriodApproachingPayload) => ({
      kind: "threshold",
      value: `${p.vatPeriodId}:${p.daysRemaining}`,
    }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  // ── Team ──────────────────────────────────────────────────────────────────────

  team_member_joined: {
    category:      "team",
    defaultInApp:  true,
    defaultEmail:  false,
    payloadVersion: 1,
    emailTemplate: "member_joined",
    activityIcon:  "member_joined",
    fingerprint: (p: BaseEventPayload & { userId: string }) => ({ kind: "exact", key: `member:${p.userId}` }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  team_member_invited: {
    category:      "team",
    defaultInApp:  true,
    defaultEmail:  false,
    payloadVersion: 1,
    emailTemplate: null,
    activityIcon:  "member_invited",
    fingerprint: (p: BaseEventPayload & { invitationId: string }) => ({ kind: "exact", key: `invite:${p.invitationId}` }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  // ── Subscription ──────────────────────────────────────────────────────────────

  subscription_payment_failed: {
    category:      "billing",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "subscription_payment_failed",
    activityIcon:  "billing_failed",
    fingerprint: (p: BaseEventPayload & { stripeEventId: string }) => ({
      kind: "exact",
      key: `stripe:${p.stripeEventId}`,
    }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },

  subscription_cancelled: {
    category:      "billing",
    defaultInApp:  true,
    defaultEmail:  true,
    payloadVersion: 1,
    emailTemplate: "generic",
    activityIcon:  "billing_cancelled",
    fingerprint: (p: BaseEventPayload & { stripeEventId: string }) => ({
      kind: "exact",
      key: `stripe:${p.stripeEventId}`,
    }),
    resolveRecipients: async (orgId) => resolveOrgAdmins(orgId),
  },
} as const
