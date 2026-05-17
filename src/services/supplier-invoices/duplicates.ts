/**
 * Duplicate detection for supplier invoices
 *
 * Strategy:
 *   1. HARD block: exact match on (orgId + supplierId/orgNumber + invoiceNumber + amount)
 *   2. SOFT warn:  fuzzy match — same supplier + amount within ±1% + date within 7 days
 *
 * Hash is computed after user confirms fields so it uses verified data, not raw AI output.
 */

import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"

export type DuplicateResult =
  | { isDuplicate: false }
  | { isDuplicate: true; type: "hard" | "soft"; existingId: string; existingReference: string }

/**
 * Computes a deterministic hash for duplicate detection.
 * Inputs are normalised (lowercase, whitespace stripped) before hashing.
 */
export function computeDuplicateHash(params: {
  organizationId:   string
  supplierKey:      string   // supplierId if matched, else supplierOrgNumber, else supplierName
  invoiceNumber:    string
  amountInclVat:    bigint
}): string {
  const raw = [
    params.organizationId,
    params.supplierKey.toLowerCase().trim(),
    params.invoiceNumber.toLowerCase().trim(),
    params.amountInclVat.toString(),
  ].join("|")

  return createHash("sha256").update(raw).digest("hex")
}

/**
 * Checks whether a supplier invoice is a duplicate of an existing one.
 *
 * Called after user confirms fields (pre-approval).
 * Returns the first match found — hard block takes precedence over soft warn.
 */
export async function checkDuplicate(params: {
  organizationId:    string
  currentInvoiceId:  string
  supplierId?:       string | null
  supplierOrgNumber?: string | null
  supplierName?:     string | null
  invoiceNumber?:    string | null
  amountInclVat?:    bigint | null
  invoiceDate?:      Date   | null
}): Promise<DuplicateResult> {
  const {
    organizationId,
    currentInvoiceId,
    supplierId,
    supplierOrgNumber,
    supplierName,
    invoiceNumber,
    amountInclVat,
    invoiceDate,
  } = params

  // Need at minimum an invoice number or amount to detect duplicates
  if (!invoiceNumber && !amountInclVat) return { isDuplicate: false }

  const supplierKey = supplierId ?? supplierOrgNumber ?? supplierName ?? ""

  // ── Hard check: exact hash match ─────────────────────────────────────────
  if (supplierKey && invoiceNumber && amountInclVat != null) {
    const hash = computeDuplicateHash({
      organizationId,
      supplierKey,
      invoiceNumber,
      amountInclVat,
    })

    const exact = await prisma.supplierInvoice.findFirst({
      where: {
        organizationId,
        duplicateHash: hash,
        id:            { not: currentInvoiceId },
        status:        { not: "rejected" },
      },
      select: { id: true, invoiceNumber: true, supplierName: true },
    })

    if (exact) {
      return {
        isDuplicate:       true,
        type:              "hard",
        existingId:        exact.id,
        existingReference: `${exact.supplierName ?? "?"} / ${exact.invoiceNumber ?? "?"}`,
      }
    }
  }

  // ── Soft check: same supplier + similar amount + date within 7 days ───────
  if (supplierId && amountInclVat != null && invoiceDate) {
    const tolerance = amountInclVat / 100n  // 1%
    const low       = amountInclVat - tolerance
    const high      = amountInclVat + tolerance

    const dateLow  = new Date(invoiceDate)
    const dateHigh = new Date(invoiceDate)
    dateLow.setDate(dateLow.getDate()   - 7)
    dateHigh.setDate(dateHigh.getDate() + 7)

    const fuzzy = await prisma.supplierInvoice.findFirst({
      where: {
        organizationId,
        supplierId,
        id:           { not: currentInvoiceId },
        status:       { not: "rejected" },
        amountInclVat: { gte: low, lte: high },
        invoiceDate:   { gte: dateLow, lte: dateHigh },
      },
      select: { id: true, invoiceNumber: true, supplierName: true },
    })

    if (fuzzy) {
      return {
        isDuplicate:       true,
        type:              "soft",
        existingId:        fuzzy.id,
        existingReference: `${fuzzy.supplierName ?? "?"} / ${fuzzy.invoiceNumber ?? "?"}`,
      }
    }
  }

  return { isDuplicate: false }
}
