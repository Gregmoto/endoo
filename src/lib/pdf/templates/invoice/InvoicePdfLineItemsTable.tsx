import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData, InvoicePdfLine } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtOre(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toLocaleString("sv-SE", { maximumFractionDigits: 4 })
}

function fmtPct(rate: number): string {
  return `${Math.round(rate * 100)} %`
}

// ─── Column widths (total usable = 531pt, inner padding 4pt each side = 523pt) ─

const COL = {
  article:  58,
  qty:      36,
  unit:     26,
  price:    58,
  discount: 38,
  total:    66,
  // description = flex:1 (remainder)
} as const

// ─── Info row (full-width note/text line) ─────────────────────────────────────

function InfoRow({ line }: { line: InvoicePdfLine }) {
  return (
    <View style={[S.tableRow, { backgroundColor: PDF_COLORS.surface }]} wrap={false}>
      <Text style={[S.tdSub, { flex: 1, fontStyle: "italic", paddingLeft: 4 }]}>
        {line.description}
      </Text>
    </View>
  )
}

// ─── Regular line row ─────────────────────────────────────────────────────────

interface RowProps {
  line:        InvoicePdfLine
  showDiscount: boolean
  currency:    string
}

function LineRow({ line, showDiscount, currency }: RowProps) {
  const qty = line.deliveredQty ?? line.quantity

  return (
    <View style={S.tableRow} wrap={false}>

      {/* Article number */}
      <Text style={[S.tdSub, { width: COL.article }]}>{line.articleNumber ?? ""}</Text>

      {/* Description + sub-info */}
      <View style={{ flex: 1 }}>
        <Text style={S.tdText}>{line.description}</Text>
        {line.dimensions && line.dimensions.length > 0 && (
          <Text style={[S.tdSub, { marginTop: 1 }]}>
            {line.dimensions.map(d => `${d.axis}: ${d.value}`).join("  ·  ")}
          </Text>
        )}
      </View>

      {/* Qty */}
      <Text style={[S.tdNum, { width: COL.qty }]}>{fmtQty(qty)}</Text>

      {/* Unit */}
      <Text style={[S.tdSub, { width: COL.unit }]}>{line.unit}</Text>

      {/* Unit price */}
      <Text style={[S.tdNum, { width: COL.price }]}>{fmtOre(line.unitPrice)}</Text>

      {/* Discount % — only rendered if column is active */}
      {showDiscount && (
        <Text style={[S.tdSub, { width: COL.discount, textAlign: "right" }]}>
          {line.discountRate > 0 ? fmtPct(line.discountRate) : ""}
        </Text>
      )}

      {/* Line total */}
      <Text style={[S.tdNumBold, { width: COL.total }]}>{fmtOre(line.lineTotal)}</Text>
    </View>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface Props {
  d: Pick<InvoicePdfData, "lang" | "lines" | "currency" | "brandingColor">
}

export function InvoicePdfLineItemsTable({ d }: Props) {
  const { lang } = d
  const accent   = d.brandingColor ?? PDF_COLORS.brand
  const showDiscount = d.lines.some(l => !l.isInfoRow && l.discountRate > 0)

  return (
    <View style={S.section}>

      {/* Table header */}
      <View style={S.tableHeader}>
        <Text style={[S.thText, { width: COL.article }]}>{t(lang, "article")}</Text>
        <Text style={[S.thText, { flex: 1 }]}>{t(lang, "description")}</Text>
        <Text style={[S.thText, { width: COL.qty, textAlign: "right" }]}>{t(lang, "quantity")}</Text>
        <Text style={[S.thText, { width: COL.unit }]}> </Text>
        <Text style={[S.thText, { width: COL.price, textAlign: "right" }]}>{t(lang, "price")}</Text>
        {showDiscount && (
          <Text style={[S.thText, { width: COL.discount, textAlign: "right" }]}>{t(lang, "discount")}</Text>
        )}
        <Text style={[S.thText, { width: COL.total, textAlign: "right" }]}>{t(lang, "amount")}</Text>
      </View>

      {/* Brand accent line under header */}
      <View style={{ height: 1, backgroundColor: accent }} />

      {/* Rows */}
      {d.lines.map((line, i) =>
        line.isInfoRow
          ? <InfoRow key={i} line={line} />
          : <LineRow key={i} line={line} showDiscount={showDiscount} currency={d.currency} />
      )}

      {/* Closing rule */}
      <View style={{ borderTopWidth: 0.5, borderColor: PDF_COLORS.borderStrong, marginTop: 2 }} />

    </View>
  )
}
