import { describe, it, expect } from "vitest"
import { calcLineTotal, calcTaxAmount } from "@/lib/contracts/utils"

// ─── Credit note line item negation ───────────────────────────────────────────
//
// When creating a credit note from invoice, unit prices are negated so that
// all derived amounts (lineTotal, taxAmount, subtotal, total) become negative.
// This mirrors the original invoice's amounts with a sign flip.

describe("credit note amount negation", () => {
  it("negating unitPrice produces negative lineTotal", () => {
    const original = { quantity: 2, unitPrice: 50000, discountRate: 0, taxRate: 0.25 }
    const credit   = { ...original, unitPrice: -original.unitPrice }

    const origLineTotal = calcLineTotal(original.quantity, original.unitPrice,  original.discountRate)
    const credLineTotal = calcLineTotal(credit.quantity,   credit.unitPrice,    credit.discountRate)

    expect(origLineTotal).toBe(100000)   // 2 × 500.00 kr
    expect(credLineTotal).toBe(-100000)  // negated
    expect(credLineTotal).toBe(-origLineTotal)
  })

  it("negated tax amount mirrors original", () => {
    const lineTotal     = calcLineTotal(1, 10000, 0)
    const negLineTotal  = calcLineTotal(1, -10000, 0)

    expect(calcTaxAmount(negLineTotal, 0.25)).toBe(-calcTaxAmount(lineTotal, 0.25))
  })

  it("credit note total = -(original total)", () => {
    const lines = [
      { qty: 3, unitPrice: 30000, discount: 0,    tax: 0.25 },
      { qty: 1, unitPrice: 50000, discount: 0.1,  tax: 0.12 },
    ]

    function computeTotals(negate: boolean) {
      const sign = negate ? -1 : 1
      const computed = lines.map(l => {
        const lt = calcLineTotal(l.qty, sign * l.unitPrice, l.discount)
        return { lineTotal: lt, taxAmount: calcTaxAmount(lt, l.tax) }
      })
      const subtotal = computed.reduce((s, l) => s + l.lineTotal, 0)
      const tax      = computed.reduce((s, l) => s + l.taxAmount, 0)
      return { subtotal, tax, total: subtotal + tax }
    }

    const orig   = computeTotals(false)
    const credit = computeTotals(true)

    expect(credit.subtotal).toBe(-orig.subtotal)
    expect(credit.tax).toBe(-orig.tax)
    expect(credit.total).toBe(-orig.total)
  })

  it("discount still applied correctly on negated price", () => {
    // 1 × (-10000) × (1 - 0.1) = -9000
    expect(calcLineTotal(1, -10000, 0.1)).toBe(-9000)
  })
})

// ─── Balance due with credit note applied ─────────────────────────────────────

describe("balance due with credit note", () => {
  const B = BigInt

  function balanceDue(invoiceTotal: bigint, paidAmount: bigint, creditNoteTotal: bigint): bigint {
    // Credit note total is negative; subtracting it adds back credit
    return invoiceTotal - paidAmount + creditNoteTotal
  }

  it("full credit note zeroes out the balance", () => {
    const total      = B(100000)
    const paid       = B(0)
    const creditNote = B(-100000)
    expect(balanceDue(total, paid, creditNote)).toBe(B(0))
  })

  it("partial credit reduces outstanding balance", () => {
    const total      = B(100000)
    const paid       = B(0)
    const creditNote = B(-30000)
    expect(balanceDue(total, paid, creditNote)).toBe(B(70000))
  })

  it("credit note on partially paid invoice", () => {
    const total      = B(100000)
    const paid       = B(40000)
    const creditNote = B(-60000)
    expect(balanceDue(total, paid, creditNote)).toBe(B(0))
  })
})
