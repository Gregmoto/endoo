import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

function fmtOre(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "currency" | "subtotalAmount" | "freightAmount" |
    "invoiceFeeAmount" | "taxAmount" | "roundingAmount" | "totalAmount">
}

export function InvoicePdfSummary({ d }: Props) {
  const lang = d.lang
  const cur  = d.currency

  const rows: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: t(lang, "sum"),    value: `${fmtOre(d.subtotalAmount)} ${cur}` },
  ]
  if (d.freightAmount > 0)
    rows.push({ label: t(lang, "freight"),    value: `${fmtOre(d.freightAmount)} ${cur}` })
  if (d.invoiceFeeAmount > 0)
    rows.push({ label: t(lang, "invoiceFee"), value: `${fmtOre(d.invoiceFeeAmount)} ${cur}` })
  rows.push({ label: t(lang, "vat"),      value: `${fmtOre(d.taxAmount)} ${cur}` })
  if (d.roundingAmount !== 0)
    rows.push({ label: t(lang, "rounding"), value: `${fmtOre(d.roundingAmount)} ${cur}` })

  return (
    <View style={S.totalsBox}>
      <View style={S.totalsInner}>
        {rows.map(({ label, value }) => (
          <View key={label} style={S.totalRow}>
            <Text style={S.totalLabel}>{label}</Text>
            <Text style={S.totalValue}>{value}</Text>
          </View>
        ))}

        {/* Att betala */}
        <View style={S.totalRowBorder}>
          <Text style={S.grandLabel}>{t(lang, "toPay")}</Text>
          <Text style={S.grandValue}>{fmtOre(d.totalAmount)} {cur}</Text>
        </View>
      </View>
    </View>
  )
}
