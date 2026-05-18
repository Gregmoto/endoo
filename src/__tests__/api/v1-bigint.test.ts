import { describe, it, expect } from "vitest"
import { toJSON } from "@/lib/serialize"

describe("v1 API BigInt safety", () => {
  it("toJSON converts a realistic invoice payload", () => {
    const payload = {
      id: "abc-123",
      totalAmount: 9_007_199_254_740_993n, // > 2^53
      paidAmount:  0n,
      taxAmount:   1_234_567n,
      lineItems: [{ total: 500_00n, unitPrice: 500_00n }],
    }
    const result = toJSON(payload)
    expect(typeof result.totalAmount).toBe("string")
    expect(result.totalAmount).toBe("9007199254740993")
    expect(result.paidAmount).toBe("0")
    expect(result.lineItems[0].total).toBe("50000")
  })

  it("does not lose precision for 2^53 + 1", () => {
    const big = 9_007_199_254_740_993n
    const result = toJSON({ amount: big })
    // Number would give "9007199254740992" (rounded), string preserves it
    expect(result.amount).toBe("9007199254740993")
    expect(result.amount).not.toBe("9007199254740992")
  })
})
