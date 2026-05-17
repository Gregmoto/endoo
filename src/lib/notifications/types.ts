import type { NotificationEventType, NotificationTemplate } from "@prisma/client"

// ─── Payload base ─────────────────────────────────────────────────────────────

export interface BaseEventPayload {
  _version:       1
  href:           string          // canonical deep link shown in inbox and email
  displayTitle:   string          // "Faktura INV-042 betalad" — pre-rendered for UI
  displaySubtitle?: string        // "Acme AB · 12 500 kr" — optional second line
}

// ─── Domain payloads ──────────────────────────────────────────────────────────

export interface InvoicePaidPayload extends BaseEventPayload {
  invoiceId:        string
  invoiceNumber:    string
  totalAmount:      string        // öre as string (BigInt safe)
  currency:         string
  contactName:      string | null
  paymentId:        string
  paymentMethod:    string
  createdByUserId:  string
}

export interface InvoiceOverduePayload extends BaseEventPayload {
  invoiceId:        string
  invoiceNumber:    string
  totalAmount:      string
  paidAmount:       string
  currency:         string
  daysOverdue:      number
  dueDate:          string        // ISO date "2026-04-01"
  contactName:      string | null
  contactEmail:     string | null
  createdByUserId:  string
}

export interface ApprovalNeededPayload extends BaseEventPayload {
  requestId:            string
  supplierInvoiceId:    string
  supplierName:         string | null
  invoiceNumber:        string | null
  amountInclVat:        string
  currency:             string
  stepId:               string
  stepName:             string
  stepOrder:            number
  resolvedApproverIds:  string[]
  submittedByUserId:    string
}

export interface ApprovalOutcomePayload extends BaseEventPayload {
  requestId:          string
  supplierInvoiceId:  string
  supplierName:       string | null
  invoiceNumber:      string | null
  amountInclVat:      string
  currency:           string
  outcome:            "approved" | "rejected"
  rejectionReason:    string | null
  submittedByUserId:  string
}

export interface PaymentRecordedPayload extends BaseEventPayload {
  paymentId:        string
  invoiceId:        string
  invoiceNumber:    string
  amountKr:         string        // display amount (already formatted)
  currency:         string
  paymentMethod:    string
  contactName:      string | null
  createdByUserId:  string
}

export interface VatPeriodApproachingPayload extends BaseEventPayload {
  vatPeriodId:    string
  periodLabel:    string          // "Q1 2026"
  dueDate:        string
  daysRemaining:  number
}

// ─── Deduplication window ─────────────────────────────────────────────────────

export type DeduplicationWindow =
  | { kind: "exact";     key: string }
  | { kind: "daily";     date?: Date }
  | { kind: "hourly";    date?: Date }
  | { kind: "threshold"; value: string }

// ─── Recipient ────────────────────────────────────────────────────────────────

export interface Recipient {
  userId: string
  reason: "entity_owner" | "role_admin" | "explicit_approver" | "platform_admin"
}

// ─── Event definition (used by registry) ─────────────────────────────────────

export interface EventDefinition<P extends BaseEventPayload = BaseEventPayload> {
  category:          string
  defaultInApp:      boolean
  defaultEmail:      boolean
  payloadVersion:    number
  emailTemplate:     NotificationTemplate | null
  activityIcon:      string
  fingerprint:       (payload: P) => DeduplicationWindow
  resolveRecipients: (organizationId: string, payload: P) => Promise<Recipient[]>
}

// ─── Dispatcher input ─────────────────────────────────────────────────────────

export interface EventInput<P extends BaseEventPayload = BaseEventPayload> {
  organizationId: string
  type:           NotificationEventType
  actorUserId?:   string | null
  entityType:     string
  entityId:       string
  payload:        P
}
