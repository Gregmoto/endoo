// SRU format types — Skatteverket electronic tax filing format
// SRU = Standardiserat RäkenskapsUtdrag
// Two files: INFO.SRU (identification) + BLANKETTER.SRU (form data)

export type SruExportType = "k2" | "k3" | "ink2"

export interface SruField {
  /** SRU field number, e.g. 2510 for Nettoomsättning on INK2R */
  field: number
  /** Value in whole kronor (NOT öre) */
  value: number
}

export interface SruBlankett {
  /** Blankett code, e.g. "INK2R", "INK2S" */
  blankett: string
  fields: SruField[]
}

export interface SruDocument {
  /** Swedish org number, exactly 10 digits without dash, e.g. "5561234567" */
  orgNumber: string
  companyName: string
  /** Tax year, e.g. 2025 for räkenskapsår ending 2025 */
  taxYear: number
  /** Generation date in YYYYMMDD format */
  createdDate: string
  blanketter: SruBlankett[]
}

// AccountBalance as returned by getAccountBalances in year-end/close.ts
export interface AccountBalanceRow {
  account: {
    id:     string
    number: string
    name:   string
    type:   string
  }
  debit:  bigint
  credit: bigint
}

// Summarized account range for SRU mapping
export interface AccountRangeSum {
  debit:  bigint
  credit: bigint
  /** Net = debit - credit */
  net: bigint
}
