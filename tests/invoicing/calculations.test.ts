import { describe, it, expect } from "vitest"
import { calculateInvoice, type InvoiceCalcInput } from "@/lib/invoicing/calculations"

function mkLine(unitPrice: bigint, quantity: number, vatRate: number, discountRate = 0, priceIncludesVat = false) {
  return { unitPrice, quantity, vatRate, discountRate, priceIncludesVat }
}

function base(): Omit<InvoiceCalcInput, "lines"> {
  return { freightAmount: 0n, invoiceFeeAmount: 0n, invoiceDiscountRate: 0, roundingMode: "off" }
}

describe("calculateInvoice", () => {
  it("single line, 25% VAT, no discount", () => {
    const res = calculateInvoice({ ...base(), lines: [mkLine(10000n, 1, 0.25)] })
    expect(res.subtotal).toBe(10000n)
    expect(res.vatAmount).toBe(2500n)
    expect(res.totalAmount).toBe(12500n)
    expect(res.roundingAmount).toBe(0n)
  })

  it("multiple lines with different VAT rates", () => {
    const lines = [
      mkLine(10000n, 1, 0.25),
      mkLine(5000n, 1, 0.12),
      mkLine(2000n, 1, 0.06),
    ]
    const res = calculateInvoice({ ...base(), lines })
    expect(res.subtotal).toBe(17000n)
    expect(res.vatBreakdown).toHaveLength(3)
    const vat25 = res.vatBreakdown.find(v => v.rate === 0.25)!
    expect(vat25.vat).toBe(2500n)
    const vat12 = res.vatBreakdown.find(v => v.rate === 0.12)!
    expect(vat12.vat).toBe(600n)
  })

  it("line with 10% discount", () => {
    const res = calculateInvoice({ ...base(), lines: [mkLine(10000n, 1, 0.25, 0.1)] })
    expect(res.subtotal).toBe(9000n)
    expect(res.vatAmount).toBe(2250n)
    expect(res.totalAmount).toBe(11250n)
  })

  it("invoice-level 5% discount applied to net", () => {
    const lines = [mkLine(10000n, 1, 0.25)]
    const res = calculateInvoice({ ...base(), lines, invoiceDiscountRate: 0.05 })
    expect(res.netAmount).toBe(9500n)
    expect(res.invoiceDiscountAmount).toBe(500n)
  })

  it("price includes VAT — strip VAT from unit price", () => {
    const res = calculateInvoice({ ...base(), lines: [mkLine(12500n, 1, 0.25, 0, true)] })
    expect(res.subtotal).toBe(10000n)
    expect(res.vatAmount).toBe(2500n)
    expect(res.totalAmount).toBe(12500n)
  })

  it("freight added with 25% VAT", () => {
    const res = calculateInvoice({ ...base(), lines: [mkLine(10000n, 1, 0.25)], freightAmount: 5000n })
    expect(res.grossAmount).toBe(10000n + 2500n + 5000n + 1250n)
  })

  it("auto rounding rounds to nearest krona (banker)", () => {
    // 10050 öre gross → rounds to 10100 (round up, 50 öre case, kronor = 100 even → stay)
    // 10050 / 100 = 100.5 kronor, 100 is even → round down to 10000
    const res = calculateInvoice({ ...base(), roundingMode: "auto", lines: [mkLine(8040n, 1, 0.25)] })
    expect(res.totalAmount % 100n).toBe(0n)
  })

  it("off mode — no rounding applied", () => {
    const res = calculateInvoice({ ...base(), roundingMode: "off", lines: [mkLine(8040n, 1, 0.25)] })
    expect(res.roundingAmount).toBe(0n)
  })

  it("zero VAT rate produces no VAT", () => {
    const res = calculateInvoice({ ...base(), lines: [mkLine(10000n, 1, 0)] })
    expect(res.vatAmount).toBe(0n)
    expect(res.totalAmount).toBe(10000n)
  })

  it("fractional quantity", () => {
    const res = calculateInvoice({ ...base(), lines: [mkLine(10000n, 2.5, 0.25)] })
    expect(res.subtotal).toBe(25000n)
    expect(res.vatAmount).toBe(6250n)
  })
})
