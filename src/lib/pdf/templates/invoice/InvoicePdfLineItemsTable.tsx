import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData, InvoicePdfLine } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

function fmtOre(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toLocaleString("sv-SE", { maximumFractionDigits: 4 })
}

interface RowProps {
  line:  InvoicePdfLine
  index: number
  currency: string
}

function LineRow({ line, index, currency }: RowProps) {
  if (line.isInfoRow) {
    return (
      <View style={index % 2 === 1 ? S.tableRowAlt : S.tableRow}>
        <Text style={[S.tdMuted, { flex: 1, paddingLeft: 12 }]}>{line.description}</Text>
      </View>
    )
  }

  const rowStyle = index % 2 === 1 ? S.tableRowAlt : S.tableRow
  const qty = line.deliveredQty ?? line.quantity

  return (
    <View style={rowStyle}>
      <Text style={[S.tdMuted, { width: 50 }]}>{line.articleNumber ?? ""}</Text>
      <Text style={[S.tdText, { flex: 1 }]}>{line.description}</Text>
      <Text style={[S.tdText, { width: 36, textAlign: "right" }]}>{fmtQty(qty)}</Text>
      <Text style={[S.tdMuted, { width: 22 }]}> {line.unit}</Text>
      <Text style={[S.tdText, { width: 56, textAlign: "right" }]}>{fmtOre(line.unitPrice)}</Text>
      <Text style={[S.tdText, { width: 62, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
        {fmtOre(line.lineTotal)}
      </Text>
    </View>
  )
}

interface Props {
  d: Pick<InvoicePdfData, "lang" | "lines" | "currency">
}

export function InvoicePdfLineItemsTable({ d }: Props) {
  const lang = d.lang

  return (
    <View style={S.section}>
      {/* Header */}
      <View style={S.tableHeaderRow}>
        <Text style={[S.thText, { width: 50 }]}>{t(lang, "article")}</Text>
        <Text style={[S.thText, { flex: 1 }]}>{t(lang, "description")}</Text>
        <Text style={[S.thText, { width: 36, textAlign: "right" }]}>{t(lang, "quantity")}</Text>
        <Text style={[S.thText, { width: 22 }]}> </Text>
        <Text style={[S.thText, { width: 56, textAlign: "right" }]}>{t(lang, "price")}</Text>
        <Text style={[S.thText, { width: 62, textAlign: "right" }]}>{t(lang, "amount")}</Text>
      </View>

      {/* Rows */}
      {d.lines.map((line, i) => (
        <LineRow key={i} line={line} index={i} currency={d.currency} />
      ))}

      {/* Closing border */}
      <View style={{ borderTopWidth: 0.5, borderColor: PDF_COLORS.border, marginTop: 2 }} />
    </View>
  )
}
