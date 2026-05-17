import type { ScoringSignals, ConfidenceBreakdown, VendorHistory } from "./types"

const WEIGHTS: Record<keyof ScoringSignals, number> = {
  vendorKnown:         0.25,
  accountHistoryMatch: 0.30,
  descriptionMatch:    0.20,
  vatRateConsistency:  0.10,
  amountReasonable:    0.05,
  modelConfidence:     0.10,
}

export function computeConfidence(signals: ScoringSignals): number {
  const score = (Object.keys(WEIGHTS) as Array<keyof ScoringSignals>)
    .reduce((sum, k) => sum + signals[k] * WEIGHTS[k], 0)
  return Math.round(score * 100) / 100
}

export function confidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.85) return "high"
  if (score >= 0.60) return "medium"
  return "low"
}

export function buildSignals(opts: {
  vendorHistory:    VendorHistory | null
  amountOre:        number
  modelConfidence:  number
  suggestedAccounts?: string[]    // accounts AI suggested
}): ScoringSignals {
  const v = opts.vendorHistory

  // vendorKnown: known vendor with some history
  const vendorKnown = v
    ? v.invoiceCount >= 5 ? 1.0
      : v.invoiceCount >= 1 ? 0.6
      : 0.3
    : 0.1

  // accountHistoryMatch: do the suggested accounts match this vendor's usual accounts?
  let accountHistoryMatch = 0.3   // baseline — no history
  if (v?.usualAccounts.length && opts.suggestedAccounts?.length) {
    const overlap = opts.suggestedAccounts.filter(a =>
      v.usualAccounts.includes(a)
    ).length
    const ratio = overlap / Math.max(opts.suggestedAccounts.length, 1)
    accountHistoryMatch = 0.3 + ratio * 0.7
  } else if (!v) {
    accountHistoryMatch = 0.3
  }

  // amountReasonable: within 3σ of historical average (simplified: within 5x)
  let amountReasonable = 0.8  // default reasonable
  if (v?.avgAmountOre && opts.amountOre) {
    const ratio = opts.amountOre / v.avgAmountOre
    if (ratio > 10 || ratio < 0.1)      amountReasonable = 0.2
    else if (ratio > 5 || ratio < 0.2)  amountReasonable = 0.5
    else if (ratio > 2 || ratio < 0.5)  amountReasonable = 0.7
    else                                amountReasonable = 1.0
  }

  return {
    vendorKnown,
    accountHistoryMatch,
    descriptionMatch:    0.7,  // static — would need embedding similarity in v2
    vatRateConsistency:  0.9,  // AI handles this; trust model
    amountReasonable,
    modelConfidence:     opts.modelConfidence,
  }
}

export function formatConfidenceBreakdown(signals: ScoringSignals): ConfidenceBreakdown & Record<string, number> {
  return { ...signals }
}
