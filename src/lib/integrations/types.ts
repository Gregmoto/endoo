/**
 * Core types for the integration platform.
 *
 * A Connector is a stateless plugin that knows how to:
 *   - verify webhook signatures
 *   - map external entities to Endoo entities
 *   - pull data in cursor-based batches (sync)
 *   - exchange OAuth codes for tokens
 */

// ─── Auth strategies ──────────────────────────────────────────────────────────

export type AuthStrategy = "api_key" | "oauth2" | "file_import"

// ─── Connector capabilities ───────────────────────────────────────────────────

export type Capability =
  | "invoices"
  | "contacts"
  | "payments"
  | "products"
  | "orders"
  | "accounting"
  | "file_import"

// ─── Mapped entity shapes ─────────────────────────────────────────────────────

export interface MappedContact {
  externalId:   string
  name:         string
  email?:       string | null
  phone?:       string | null
  orgNumber?:   string | null
  vatNumber?:   string | null
  address?:     string | null
  city?:        string | null
  postalCode?:  string | null
  country?:     string | null
}

export interface MappedInvoiceLineItem {
  description: string
  quantity:    number
  unitPrice:   number  // in öre (integer)
  vatRate:     number  // e.g. 25 for 25%
  accountCode?: string | null
}

export interface MappedInvoice {
  externalId:     string
  externalNumber: string
  contactId?:     string | null  // internal contact id if already resolved
  contactExternalId?: string | null
  issueDate:      Date
  dueDate:        Date
  currency:       string
  lineItems:      MappedInvoiceLineItem[]
  totalAmount:    number  // öre
  status:         "draft" | "sent" | "paid" | "void" | "overdue"
}

export interface MappedPayment {
  externalId:        string
  invoiceExternalId: string
  amount:            number  // öre
  currency:          string
  paidAt:            Date
  method?:           string | null
}

// ─── Sync batch ───────────────────────────────────────────────────────────────

export interface SyncBatch {
  contacts?:  MappedContact[]
  invoices?:  MappedInvoice[]
  payments?:  MappedPayment[]
  nextCursor: string | null  // null = done
}

// ─── OAuth token response ─────────────────────────────────────────────────────

export interface OAuthTokens {
  accessToken:  string
  refreshToken?: string | null
  expiresAt?:   Date | null
  scope?:       string | null
}

// ─── Webhook verification result ──────────────────────────────────────────────

export interface WebhookVerification {
  valid:   boolean
  topic:   string          // e.g. "payment.succeeded"
  eventId: string          // externalEventId for dedup
  payload: unknown
}

// ─── Import preview ───────────────────────────────────────────────────────────

export interface ImportPreview {
  journalCount:  number
  accountCount:  number
  periodCovered: { from: string; to: string }
  warnings:      string[]
  entries:       ImportPreviewEntry[]
}

export interface ImportPreviewEntry {
  date:        string
  description: string
  debitAccount:  string
  creditAccount: string
  amount:      number  // öre
}

// ─── Connector interface ──────────────────────────────────────────────────────

export interface ConnectorConfig {
  /** Human-readable name shown in UI */
  displayName: string
  /** e.g. "stripe", "fortnox", "shopify" */
  slug:        string
  authStrategy: AuthStrategy
  capabilities: Capability[]
  /** OAuth scopes if applicable */
  scopes?:     string[]
  webhookTopics?: string[]
}

export interface Connector {
  config: ConnectorConfig

  // ── Webhook ─────────────────────────────────────────────────────────────────
  verifyWebhook?(
    rawBody:   Buffer,
    headers:   Record<string, string>,
    secret:    string,
  ): WebhookVerification

  /** Map a verified webhook payload to Endoo entities (return null to skip) */
  mapWebhookToEntities?(
    topic:   string,
    payload: unknown,
  ): {
    contacts?:  MappedContact[]
    invoices?:  MappedInvoice[]
    payments?:  MappedPayment[]
  } | null

  // ── Sync ────────────────────────────────────────────────────────────────────
  sync?(opts: {
    apiKey?:      string | null
    accessToken?: string | null
    cursor?:      string | null
    fromDate?:    Date
  }): AsyncGenerator<SyncBatch>

  // ── OAuth ───────────────────────────────────────────────────────────────────
  exchangeCode?(code: string, redirectUri: string): Promise<OAuthTokens>
  refreshTokens?(refreshToken: string): Promise<OAuthTokens>

  // ── File import ─────────────────────────────────────────────────────────────
  parseImportFile?(buffer: Buffer, filename: string): Promise<ImportPreview>
  commitImport?(
    buffer:         Buffer,
    filename:       string,
    organizationId: string,
    userId:         string,
    fileHash:       string,
  ): Promise<{ journalsCreated: number }>
}
