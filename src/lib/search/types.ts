export type SearchEntityType =
  | "contact"
  | "invoice"
  | "supplier_invoice"
  | "product"
  | "journal"
  | "member"

export interface SearchResult {
  id:         string
  entityType: SearchEntityType
  entityId:   string
  title:      string
  subtitle:   string | null
  url:        string          // relative to org root, e.g. "/invoices/abc"
  metadata:   Record<string, unknown>
  rank:       number
}

export interface SearchOptions {
  organizationId: string
  q:              string
  types?:         SearchEntityType[]
  limit?:         number
}

// Payload passed to indexEntity() — one shape per entity type
export interface IndexEntityInput {
  entityType: SearchEntityType
  entityId:   string
  title:      string
  subtitle?:  string | null
  keywords:   string          // space-separated searchable tokens
  url:        string
  metadata?:  Record<string, unknown>
}

export const ENTITY_LABELS: Record<SearchEntityType, string> = {
  contact:          "Kund",
  invoice:          "Faktura",
  supplier_invoice: "Lev.faktura",
  product:          "Produkt",
  journal:          "Verifikat",
  member:           "Användare",
}

export const ENTITY_ICONS: Record<SearchEntityType, string> = {
  contact:          "☰",
  invoice:          "◈",
  supplier_invoice: "⊞",
  product:          "⬡",
  journal:          "≡",
  member:           "○",
}
