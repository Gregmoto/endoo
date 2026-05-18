import { describe, it, expect } from "vitest"
import {
  VAT_TYPES,
  VAT_TYPE_OPTIONS,
  getVatType,
  getVatRate,
  isReverseCharge,
  isZeroRated,
  type VatTypeCode,
} from "@/lib/invoicing/vat-types"

const ALL_CODES: VatTypeCode[] = [
  "SE25","SE12","SE06","SE00",
  "EU_VARU","EU_TJANST","EU_VARU_INKOP","EU_TJANST_INKOP",
  "EXPORT","OMVMOMS_BYGG","OMVMOMS_GULD","MFRI","VMB25",
]

describe("VAT_TYPES — all 13 codes present", () => {
  it("has exactly 13 VAT types", () => {
    expect(Object.keys(VAT_TYPES)).toHaveLength(13)
  })

  ALL_CODES.forEach(code => {
    it(`${code} has required fields`, () => {
      const def = VAT_TYPES[code]
      expect(def).toBeDefined()
      expect(def.code).toBe(code)
      expect(typeof def.label).toBe("string")
      expect(def.label.length).toBeGreaterThan(0)
      expect(typeof def.rate).toBe("number")
      expect(def.rate).toBeGreaterThanOrEqual(0)
      expect(def.rate).toBeLessThanOrEqual(1)
      expect(typeof def.reverseCharge).toBe("boolean")
      expect(typeof def.description).toBe("string")
    })
  })
})

describe("getVatType", () => {
  it("returns definition for valid code", () => {
    expect(getVatType("SE25")?.code).toBe("SE25")
  })

  it("returns undefined for unknown code", () => {
    expect(getVatType("UNKNOWN")).toBeUndefined()
  })
})

describe("getVatRate", () => {
  it("SE25 → 0.25", () => { expect(getVatRate("SE25")).toBe(0.25) })
  it("SE12 → 0.12", () => { expect(getVatRate("SE12")).toBe(0.12) })
  it("SE06 → 0.06", () => { expect(getVatRate("SE06")).toBe(0.06) })
  it("SE00 → 0", () => { expect(getVatRate("SE00")).toBe(0) })
  it("EXPORT → 0", () => { expect(getVatRate("EXPORT")).toBe(0) })
  it("unknown code → defaults to 0.25", () => { expect(getVatRate("INVALID")).toBe(0.25) })
})

describe("isReverseCharge", () => {
  it("EU_VARU is reverse charge", () => { expect(isReverseCharge("EU_VARU")).toBe(true) })
  it("EU_TJANST is reverse charge", () => { expect(isReverseCharge("EU_TJANST")).toBe(true) })
  it("SE25 is not reverse charge", () => { expect(isReverseCharge("SE25")).toBe(false) })
})

describe("isZeroRated", () => {
  it("SE00 is zero rated", () => { expect(isZeroRated("SE00")).toBe(true) })
  it("EXPORT is zero rated", () => { expect(isZeroRated("EXPORT")).toBe(true) })
  it("SE25 is not zero rated", () => { expect(isZeroRated("SE25")).toBe(false) })
  it("SE12 is not zero rated", () => { expect(isZeroRated("SE12")).toBe(false) })
})

describe("VAT_TYPE_OPTIONS", () => {
  it("contains one entry per VAT type", () => {
    expect(VAT_TYPE_OPTIONS).toHaveLength(13)
  })

  it("each option has value and label", () => {
    VAT_TYPE_OPTIONS.forEach(opt => {
      expect(opt).toHaveProperty("value")
      expect(opt).toHaveProperty("label")
    })
  })
})
