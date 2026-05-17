// ─── Shared AI types ─────────────────────────────────────────────────────────

export type AiFeature =
  | "receipt_scan"
  | "account_suggest"
  | "journal_suggest"
  | "anomaly_detect"
  | "explain"

// ─── Account suggestion ───────────────────────────────────────────────────────

export interface AccountSuggestion {
  accountNumber: string
  accountName:   string
  side:          "debit" | "credit"
  confidence:    number
  reason:        string
}

export interface AccountSuggestResult {
  suggestions: AccountSuggestion[]
}

// ─── Receipt / invoice extraction ────────────────────────────────────────────

export interface ExtractedLineItem {
  description: string
  quantity:    number
  unitPrice:   number   // öre
  vatRate:     number   // 0.25 | 0.12 | 0.06 | 0
  vatAmount:   number   // öre
  total:       number   // öre incl. VAT
}

export interface ExtractedInvoice {
  vendor:           string | null
  vendorOrgNumber:  string | null
  vendorVatNumber:  string | null
  invoiceNumber:    string | null
  invoiceDate:      string | null   // YYYY-MM-DD
  dueDate:          string | null   // YYYY-MM-DD
  currency:         string          // "SEK"
  lines:            ExtractedLineItem[]
  subtotalExVat:    number          // öre
  vatTotal:         number          // öre
  totalInclVat:     number          // öre
  suggestedAccounts: JournalLine[]
  confidence:       number
  extractionNotes:  string | null
}

// ─── Journal suggestion ───────────────────────────────────────────────────────

export interface JournalLine {
  accountNumber: string
  accountName:   string
  debit:         number   // öre (0 if credit entry)
  credit:        number   // öre (0 if debit entry)
  vatCode:       string | null  // "MP1" | "MP2" | "MP3" | "MF" | null
  description:   string | null
}

export interface ConfidenceBreakdown {
  vendorKnown:          number
  accountHistoryMatch:  number
  descriptionMatch:     number
  vatRateConsistency:   number
  amountReasonable:     number
  modelConfidence:      number
}

export interface JournalSuggestResult {
  entries:             JournalLine[]
  confidence:          number
  confidenceBreakdown: ConfidenceBreakdown
  warnings:            string[]
  explanation:         string
}

// ─── Explanation ─────────────────────────────────────────────────────────────

export interface ExplainResult {
  explanation:     string
  relatedAccounts: string[]
  examples:        string[]
}

// ─── Confidence scoring signals ───────────────────────────────────────────────

export interface ScoringSignals {
  vendorKnown:         number
  accountHistoryMatch: number
  descriptionMatch:    number
  vatRateConsistency:  number
  amountReasonable:    number
  modelConfidence:     number
}

// ─── Accounting context for structured AI calls ───────────────────────────────

export interface AccountInfo {
  number: string
  name:   string
  type:   string
}

export interface VendorHistory {
  vendorName:     string
  invoiceCount:   number
  avgAmountOre:   number
  usualAccounts:  string[]   // account numbers most used with this vendor
  lastInvoiceDate: string | null
}

export interface AccountingAiContext {
  orgName:        string
  orgNumber:      string | null
  vatNumber:      string | null
  accounts:       AccountInfo[]
  vendorHistory:  VendorHistory | null
  recentPatterns: string[]   // last 10 journal descriptions for pattern matching
}
