// Invoice calculation engine — pure functions, no side effects
// All monetary amounts in öre (BigInt). No floating-point in monetary paths.
//
// Multiplication of BigInt × Decimal:
//   We represent rates as scaled integers (e.g. 25% = 2500 / 10000)
//   and use integer arithmetic throughout.

import { applyRounding, type RoundingMode } from "./rounding"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceLineInput {
  quantity:         number         // e.g. 3.5 (converted to scaled int internally)
  unitPrice:        bigint         // öre
  discountRate:     number         // 0–1, e.g. 0.10 for 10%
  vatRate:          number         // 0–1, e.g. 0.25 for 25%
  priceIncludesVat: boolean        // if true, unitPrice already includes VAT
}

export interface InvoiceCalcInput {
  lines:                InvoiceLineInput[]
  freightAmount:        bigint   // öre
  invoiceFeeAmount:     bigint   // öre
  invoiceDiscountRate:  number   // 0–1, discount on entire invoice
  roundingMode:         RoundingMode
}

export interface VatBreakdown {
  rate:    number   // 0.25 etc.
  base:    bigint   // excl. VAT (öre)
  vat:     bigint   // VAT amount (öre)
}

export interface InvoiceLineResult {
  lineNetAmount:   bigint  // after discount, excl. VAT
  lineVatAmount:   bigint
  lineGrossAmount: bigint
}

export interface InvoiceCalcResult {
  /** Sum of all line net amounts (excl. VAT, before invoice-level discount) */
  subtotal:              bigint
  /** Total of all per-line discounts */
  lineDiscountTotal:     bigint
  /** subtotal after invoice-level discount */
  netAmount:             bigint
  /** Discount from invoiceDiscountRate applied to subtotal */
  invoiceDiscountAmount: bigint
  /** VAT base (= netAmount + freight + fee) */
  taxableAmount:         bigint
  /** Total VAT amount */
  vatAmount:             bigint
  /** netAmount + vatAmount + freightAmount + invoiceFeeAmount */
  grossAmount:           bigint
  /** Öresutjämning adjustment */
  roundingAmount:        bigint
  /** Final amount to pay */
  totalAmount:           bigint
  vatBreakdown:          VatBreakdown[]
  lines:                 InvoiceLineResult[]
}

// ─── Rate scaling helpers ─────────────────────────────────────────────────────

// We scale rates to 1,000,000 for integer multiplication
const SCALE = 1_000_000n

function rateToScaled(rate: number): bigint {
  return BigInt(Math.round(rate * 1_000_000))
}

function mulScaled(amount: bigint, scaledRate: bigint): bigint {
  // Divide with round-half-up
  const product = amount * scaledRate
  const half    = SCALE / 2n
  return (product + half) / SCALE
}

// ─── Single line calculation ─────────────────────────────────────────────────

function calcLine(line: InvoiceLineInput): InvoiceLineResult {
  const qtyScaled       = rateToScaled(line.quantity)
  const discountScaled  = rateToScaled(line.discountRate)
  const vatScaled       = rateToScaled(line.vatRate)

  // Gross line price (unitPrice × quantity)
  const grossUnitPrice  = line.unitPrice
  const grossLineAmount = mulScaled(grossUnitPrice, qtyScaled)

  // Discount
  const discountAmount  = mulScaled(grossLineAmount, discountScaled)
  const afterDiscount   = grossLineAmount - discountAmount

  let lineNetAmount: bigint
  let lineVatAmount: bigint

  if (line.priceIncludesVat) {
    // Strip VAT from price: net = price / (1 + vatRate)
    // net = afterDiscount * SCALE / (SCALE + vatScaled)
    const divisor  = SCALE + vatScaled
    const half     = divisor / 2n
    lineNetAmount  = (afterDiscount * SCALE + half) / divisor
    lineVatAmount  = afterDiscount - lineNetAmount
  } else {
    lineNetAmount = afterDiscount
    lineVatAmount = mulScaled(lineNetAmount, vatScaled)
  }

  return {
    lineNetAmount,
    lineVatAmount,
    lineGrossAmount: lineNetAmount + lineVatAmount,
  }
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function calculateInvoice(input: InvoiceCalcInput): InvoiceCalcResult {
  const lineResults = input.lines.map(calcLine)

  // Subtotal = sum of all line net amounts (excl. per-line discounts already applied)
  const subtotal       = lineResults.reduce((s, l) => s + l.lineNetAmount, 0n)

  // Line discount total = sum of (gross - net) for all lines
  const lineDiscountTotal = input.lines.reduce((s, line, i) => {
    const qtyScaled      = rateToScaled(line.quantity)
    const discountScaled = rateToScaled(line.discountRate)
    const grossLine      = mulScaled(line.unitPrice, qtyScaled)
    return s + mulScaled(grossLine, discountScaled)
  }, 0n)

  // Invoice-level discount on subtotal
  const invoiceDiscountScaled  = rateToScaled(input.invoiceDiscountRate)
  const invoiceDiscountAmount  = mulScaled(subtotal, invoiceDiscountScaled)
  const netAmount              = subtotal - invoiceDiscountAmount

  // Add freight + fee to get taxable base (freight/fee assumed same VAT as... 25% SE25)
  // Per spec freight and invoiceFee are separate from line VAT breakdown
  const taxableAmount = netAmount + input.freightAmount + input.invoiceFeeAmount

  // VAT breakdown: group by rate, apply invoice discount proportionally
  const vatMap = new Map<number, { base: bigint; vat: bigint }>()

  for (let i = 0; i < input.lines.length; i++) {
    const line   = input.lines[i]
    const result = lineResults[i]

    // Scale down for invoice discount
    const discountedNet = result.lineNetAmount - mulScaled(result.lineNetAmount, invoiceDiscountScaled)
    const vatScaled     = rateToScaled(line.vatRate)
    const vatAmount     = mulScaled(discountedNet, vatScaled)

    const existing = vatMap.get(line.vatRate) ?? { base: 0n, vat: 0n }
    vatMap.set(line.vatRate, {
      base: existing.base + discountedNet,
      vat:  existing.vat  + vatAmount,
    })
  }

  // Freight always 25% VAT (SE25) by default — actual VAT rate could be configurable
  // TODO: make freightVatRate configurable per invoice
  if (input.freightAmount > 0n) {
    const freightVat = mulScaled(input.freightAmount, rateToScaled(0.25))
    const existing   = vatMap.get(0.25) ?? { base: 0n, vat: 0n }
    vatMap.set(0.25, { base: existing.base + input.freightAmount, vat: existing.vat + freightVat })
  }

  const vatBreakdown: VatBreakdown[] = Array.from(vatMap.entries())
    .map(([rate, { base, vat }]) => ({ rate, base, vat }))
    .sort((a, b) => b.rate - a.rate)

  const vatAmount   = vatBreakdown.reduce((s, v) => s + v.vat, 0n)
  const grossBefore = netAmount + vatAmount + input.freightAmount + input.invoiceFeeAmount

  // Öresutjämning
  const { rounded, adjustment } = applyRounding(grossBefore, input.roundingMode)

  return {
    subtotal,
    lineDiscountTotal,
    netAmount,
    invoiceDiscountAmount,
    taxableAmount,
    vatAmount,
    grossAmount:   grossBefore,
    roundingAmount: adjustment,
    totalAmount:   rounded,
    vatBreakdown,
    lines:         lineResults,
  }
}
