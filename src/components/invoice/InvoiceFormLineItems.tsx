"use client"

import { useEffect } from "react"
import { InvoiceFormLineRow } from "./InvoiceFormLineRow"

// ─── Shared line-item type (exported for the invoice form) ────────────────────

export type FLineItem = {
  id:                string
  productId:         string | null
  sku:               string
  description:       string
  warehouseLocation: string
  orderedQty:        string
  deliveredQty:      string
  unit:              string
  unitPriceStr:      string    // kr as text
  discountValue:     string    // number as text
  discountMode:      "%" | "kr"
  taxRate:           number    // 0.25 etc.
  accountNumber:     string
  vatType:           string | null
  purchasePriceOre:  number
}

export function newFLine(): FLineItem {
  return {
    id: crypto.randomUUID(), productId: null, sku: "", description: "",
    warehouseLocation: "", orderedQty: "", deliveredQty: "", unit: "st",
    unitPriceStr: "", discountValue: "", discountMode: "%",
    taxRate: 0.25, accountNumber: "", vatType: null, purchasePriceOre: 0,
  }
}

// ─── Totals helper ────────────────────────────────────────────────────────────

export function computeLineTotals(line: FLineItem) {
  const qty       = parseFloat(line.orderedQty) || 0
  const priceOre  = Math.round((parseFloat(line.unitPriceStr) || 0) * 100)
  const discVal   = parseFloat(line.discountValue) || 0
  const discRate  = line.discountMode === "%" ? discVal / 100 : 0
  const discAmt   = line.discountMode === "kr" ? Math.round(discVal * 100) : 0
  const net       = Math.round(qty * priceOre * (1 - discRate)) - discAmt
  const tax       = Math.round(net * line.taxRate)
  return { net, tax, total: net + tax }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtOre(ore: number) {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  lines:     FLineItem[]
  onChange:  (lines: FLineItem[]) => void
  currency?: string
}

export function InvoiceFormLineItems({ lines, onChange, currency = "SEK" }: Props) {

  // Ensure at least 3 rows on mount
  useEffect(() => {
    if (lines.length < 3) {
      const extras = Array.from({ length: 3 - lines.length }, () => newFLine())
      onChange([...lines, ...extras])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateLine(id: string, updates: Partial<FLineItem>) {
    const next = lines.map(l => l.id === id ? { ...l, ...updates } : l)
    const lastLine = next[next.length - 1]
    const lastHasContent = lastLine && (
      lastLine.description || lastLine.sku || lastLine.unitPriceStr || lastLine.orderedQty
    )
    if (lastHasContent) {
      onChange([...next, newFLine()])
    } else {
      onChange(next)
    }
  }

  function removeLine(id: string) {
    const filtered = lines.filter(l => l.id !== id)
    onChange(filtered.length > 0 ? filtered : [newFLine()])
  }

  function duplicateLine(id: string) {
    const src = lines.find(l => l.id === id)
    if (!src) return
    const copy: FLineItem = { ...src, id: crypto.randomUUID() }
    const idx = lines.findIndex(l => l.id === id)
    const next = [...lines]
    next.splice(idx + 1, 0, copy)
    onChange(next)
  }

  function addLine() {
    onChange([...lines, newFLine()])
  }

  const totals = lines.reduce((acc, l) => {
    const t = computeLineTotals(l)
    return { net: acc.net + t.net, tax: acc.tax + t.tax, total: acc.total + t.total }
  }, { net: 0, tax: 0, total: 0 })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-20">Artikelnr</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Benämning</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-20">Lagerst.</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-16">Best.ant.</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-16">Lev.ant.</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-14">Enhet</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-24">À-pris</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-28">Rabatt</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-24">Summa</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground w-14">Moms</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-20">Konto</th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground w-14">TG%</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <InvoiceFormLineRow
              key={line.id}
              line={line}
              index={i}
              isLast={i === lines.length - 1}
              onChange={updateLine}
              onRemove={removeLine}
              onDuplicate={duplicateLine}
            />
          ))}
        </tbody>
      </table>

      {/* Totals + add-button row */}
      <div className="flex items-start justify-between px-2 pt-3 pb-1 border-t border-border">
        <button
          type="button"
          onClick={addLine}
          className="text-sm text-primary hover:underline font-medium px-1"
        >
          + Lägg till rad
        </button>
        <div className="text-sm space-y-1 text-right">
          <div className="text-muted-foreground tabular-nums">
            Netto: {fmtOre(totals.net)} {currency}
          </div>
          <div className="text-muted-foreground tabular-nums">
            Moms: {fmtOre(totals.tax)} {currency}
          </div>
          <div className="font-bold text-foreground tabular-nums border-t border-border pt-1">
            Totalt: {fmtOre(totals.total)} {currency}
          </div>
        </div>
      </div>
    </div>
  )
}
