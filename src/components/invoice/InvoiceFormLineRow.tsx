"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { FLineItem } from "./InvoiceFormLineItems"
import { computeLineTotals } from "./InvoiceFormLineItems"

// ─── Types ─────────────────────────────────────────────────────────────────────

type ArticleHit = {
  id:                string
  sku:               string | null
  name:              string
  unitPrice:         number   // öre
  averageCost:       number   // öre
  vatType:           string | null
  salesAccount:      string | null
  warehouseLocation: string | null
}

type AccountHit = {
  id:     string
  number: string
  name:   string
}

// ─── Input cell helper ─────────────────────────────────────────────────────────

const cellInput = [
  "w-full bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-primary rounded",
  "text-sm text-foreground placeholder:text-muted-foreground/50",
  "px-1 py-0.5",
].join(" ")

const numInput = cellInput + " text-right tabular-nums"

// ─── Row component ─────────────────────────────────────────────────────────────

interface Props {
  line:        FLineItem
  index:       number
  isLast:      boolean
  onChange:    (id: string, updates: Partial<FLineItem>) => void
  onRemove:    (id: string) => void
  onDuplicate: (id: string) => void
}

export function InvoiceFormLineRow({ line, index, onChange, onRemove, onDuplicate }: Props) {
  const [skuSearch,     setSkuSearch]     = useState("")
  const [skuHits,       setSkuHits]       = useState<ArticleHit[]>([])
  const [acctSearch,    setAcctSearch]    = useState(line.accountNumber)
  const [acctHits,      setAcctHits]      = useState<AccountHit[]>([])
  const [showAcct,      setShowAcct]      = useState(false)
  const [actionOpen,    setActionOpen]    = useState(false)

  const skuTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const acctTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const actionRef  = useRef<HTMLDivElement>(null)

  // ── Product typeahead ────────────────────────────────────────────────────────

  const searchArticles = useCallback((q: string) => {
    if (q.length < 1) { setSkuHits([]); return }
    if (skuTimer.current) clearTimeout(skuTimer.current)
    skuTimer.current = setTimeout(() => {
      fetch(`/api/articles?search=${encodeURIComponent(q)}&limit=8`)
        .then(r => r.ok ? r.json() : { articles: [] })
        .then(d => setSkuHits(d.articles ?? []))
    }, 200)
  }, [])

  function fillFromArticle(a: ArticleHit) {
    onChange(line.id, {
      productId:         a.id,
      sku:               a.sku ?? "",
      description:       a.name,
      warehouseLocation: a.warehouseLocation ?? "",
      unitPriceStr:      a.unitPrice > 0 ? (a.unitPrice / 100).toFixed(2) : "",
      taxRate:           vatRateFromType(a.vatType),
      vatType:           a.vatType,
      accountNumber:     a.salesAccount ?? "",
      purchasePriceOre:  a.averageCost,
    })
    setSkuSearch("")
    setSkuHits([])
    setAcctSearch(a.salesAccount ?? "")
  }

  // ── Account typeahead ────────────────────────────────────────────────────────

  const searchAccounts = useCallback((q: string) => {
    if (q.length < 1) { setAcctHits([]); return }
    if (acctTimer.current) clearTimeout(acctTimer.current)
    acctTimer.current = setTimeout(() => {
      fetch(`/api/accounting/accounts?search=${encodeURIComponent(q)}&type=income&limit=8`)
        .then(r => r.ok ? r.json() : { accounts: [] })
        .then(d => setAcctHits(d.accounts ?? d ?? []))
    }, 200)
  }, [])

  function pickAccount(a: AccountHit) {
    onChange(line.id, { accountNumber: a.number })
    setAcctSearch(a.number)
    setAcctHits([])
    setShowAcct(false)
  }

  // ── Close action menu on outside click ──────────────────────────────────────

  useEffect(() => {
    if (!actionOpen) return
    function handler(e: MouseEvent) {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setActionOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [actionOpen])

  // ── Calculations ─────────────────────────────────────────────────────────────

  const { net, total } = computeLineTotals(line)
  const priceOre       = Math.round((parseFloat(line.unitPriceStr) || 0) * 100)
  const tgPct          = priceOre > 0
    ? ((priceOre - line.purchasePriceOre) / priceOre * 100)
    : null

  const rowCls = [
    "border-b border-border/50 align-middle group",
    index % 2 === 0 ? "" : "bg-muted/30",
    "hover:bg-accent/10",
  ].join(" ")

  const tdCls = "px-1 py-0.5 relative"

  return (
    <tr className={rowCls}>

      {/* 1. Artikelnr */}
      <td className={tdCls}>
        <input
          className={cellInput}
          value={skuSearch || line.sku}
          placeholder="Art.nr…"
          onChange={e => {
            setSkuSearch(e.target.value)
            searchArticles(e.target.value)
            if (!e.target.value) onChange(line.id, { sku: "", productId: null })
          }}
          onBlur={() => setTimeout(() => setSkuHits([]), 150)}
        />
        {skuHits.length > 0 && (
          <div className="absolute left-0 top-full z-30 w-72 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {skuHits.map(a => (
              <button
                key={a.id}
                type="button"
                onMouseDown={() => fillFromArticle(a)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between border-b border-border/50 last:border-0"
              >
                <span>
                  {a.sku && <span className="font-mono text-xs text-muted-foreground mr-2">{a.sku}</span>}
                  <span className="text-foreground">{a.name}</span>
                </span>
                <span className="text-muted-foreground text-xs tabular-nums ml-2 flex-shrink-0">
                  {a.unitPrice > 0 ? (a.unitPrice / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 }) : "–"}
                </span>
              </button>
            ))}
          </div>
        )}
      </td>

      {/* 2. Benämning */}
      <td className={tdCls}>
        <input
          className={cellInput}
          value={line.description}
          placeholder="Benämning…"
          onChange={e => onChange(line.id, { description: e.target.value })}
        />
      </td>

      {/* 3. Lagerställe */}
      <td className={tdCls}>
        <input
          className={cellInput}
          value={line.warehouseLocation}
          placeholder="–"
          onChange={e => onChange(line.id, { warehouseLocation: e.target.value })}
        />
      </td>

      {/* 4. Best.antal */}
      <td className={tdCls}>
        <input
          className={numInput}
          value={line.orderedQty}
          inputMode="decimal"
          placeholder="0"
          onChange={e => {
            const v = sanitizeDecimal(e.target.value)
            onChange(line.id, { orderedQty: v, deliveredQty: line.deliveredQty || v })
          }}
        />
      </td>

      {/* 5. Lev.antal */}
      <td className={tdCls}>
        <input
          className={numInput}
          value={line.deliveredQty}
          inputMode="decimal"
          placeholder={line.orderedQty || "0"}
          onChange={e => onChange(line.id, { deliveredQty: sanitizeDecimal(e.target.value) })}
        />
      </td>

      {/* 6. Enhet */}
      <td className={tdCls}>
        <select
          value={line.unit}
          onChange={e => onChange(line.id, { unit: e.target.value })}
          className="w-full bg-transparent border-0 focus:outline-none text-sm text-foreground py-0.5 cursor-pointer"
        >
          {["st","h","m","kg","l","m²","m³","dag","vecka","månad","år"].map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </td>

      {/* 7. À-pris */}
      <td className={tdCls}>
        <input
          className={numInput}
          value={line.unitPriceStr}
          inputMode="decimal"
          placeholder="0,00"
          onChange={e => onChange(line.id, { unitPriceStr: sanitizeDecimal(e.target.value) })}
        />
      </td>

      {/* 8. Rabatt */}
      <td className={tdCls}>
        <div className="flex items-center gap-0.5">
          <input
            className={numInput + " flex-1 min-w-0"}
            value={line.discountValue}
            inputMode="decimal"
            placeholder="0"
            onChange={e => onChange(line.id, { discountValue: sanitizeDecimal(e.target.value) })}
          />
          <select
            value={line.discountMode}
            onChange={e => onChange(line.id, { discountMode: e.target.value as "%" | "kr" })}
            className="bg-transparent border border-input rounded text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary px-0.5 py-0.5 w-10 flex-shrink-0"
          >
            <option value="%">%</option>
            <option value="kr">kr</option>
          </select>
        </div>
      </td>

      {/* 9. Summa (read-only) */}
      <td className="px-2 py-0.5 text-right tabular-nums text-sm text-foreground font-medium">
        {net !== 0 ? fmtOre(net) : "–"}
      </td>

      {/* 10. Moms */}
      <td className={tdCls + " text-center"}>
        <select
          value={line.taxRate}
          onChange={e => onChange(line.id, { taxRate: parseFloat(e.target.value) })}
          className="w-full bg-transparent border-0 focus:outline-none text-sm text-muted-foreground py-0.5 text-center cursor-pointer"
        >
          <option value={0.25}>25%</option>
          <option value={0.12}>12%</option>
          <option value={0.06}>6%</option>
          <option value={0}>0%</option>
        </select>
      </td>

      {/* 11. Konto */}
      <td className={tdCls}>
        <input
          className={cellInput + " font-mono"}
          value={acctSearch}
          placeholder="3001"
          onChange={e => {
            setAcctSearch(e.target.value)
            onChange(line.id, { accountNumber: e.target.value })
            setShowAcct(true)
            searchAccounts(e.target.value)
          }}
          onFocus={() => { setShowAcct(true); if (acctSearch) searchAccounts(acctSearch) }}
          onBlur={() => setTimeout(() => { setShowAcct(false); setAcctHits([]) }, 150)}
        />
        {showAcct && acctHits.length > 0 && (
          <div className="absolute left-0 top-full z-30 w-60 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {acctHits.map(a => (
              <button
                key={a.id}
                type="button"
                onMouseDown={() => pickAccount(a)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 border-b border-border/50 last:border-0"
              >
                <span className="font-mono text-foreground">{a.number}</span>
                <span className="text-muted-foreground text-xs truncate">{a.name}</span>
              </button>
            ))}
          </div>
        )}
      </td>

      {/* 12. TG% (read-only) */}
      <td className="px-2 py-0.5 text-right tabular-nums text-xs">
        {tgPct !== null ? (
          <span className={tgPct >= 30 ? "text-primary" : tgPct >= 0 ? "text-muted-foreground" : "text-destructive"}>
            {tgPct.toFixed(1)}%
          </span>
        ) : (
          <span className="text-muted-foreground/40">–</span>
        )}
      </td>

      {/* 13. Actions */}
      <td className="px-1 py-0.5 text-center" ref={actionRef as React.RefObject<HTMLTableCellElement>}>
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setActionOpen(o => !o)}
            className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            title="Åtgärder"
          >
            ⋮
          </button>
          {actionOpen && (
            <div className="absolute right-0 top-full z-40 w-36 bg-card border border-border rounded-lg shadow-md py-1">
              <button
                type="button"
                onClick={() => { onDuplicate(line.id); setActionOpen(false) }}
                className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent"
              >
                Duplicera rad
              </button>
              <button
                type="button"
                onClick={() => { onRemove(line.id); setActionOpen(false) }}
                className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
              >
                Ta bort rad
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sanitizeDecimal(v: string): string {
  return v.replace(/[^0-9.,\-]/g, "").replace(",", ".")
}

function vatRateFromType(vatType: string | null | undefined): number {
  if (!vatType) return 0.25
  if (vatType.includes("25") || vatType === "SE25") return 0.25
  if (vatType.includes("12") || vatType === "SE12") return 0.12
  if (vatType.includes("06") || vatType === "SE06") return 0.06
  if (vatType.includes("00") || vatType === "SE00") return 0
  return 0.25
}

function fmtOre(ore: number) {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
