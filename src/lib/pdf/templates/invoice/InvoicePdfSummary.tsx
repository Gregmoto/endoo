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
    "invoiceFeeAmount" | "vatBreakdown" | "taxAmount" |
    "roundingAmount" | "totalAmount">
}

export function InvoicePdfSummary({ d }: Props) {
  const { lang, currency: cur } = d

  // Build sub-total rows (above VAT)
  const preRows: Array<{ label: string; value: string }> = [
    { label: t(lang, "sum"), value: `${fmtOre(d.subtotalAmount)} ${cur}` },
  ]
  if (d.freightAmount > 0)
    preRows.push({ label: t(lang, "freight"),    value: `${fmtOre(d.freightAmount)} ${cur}` })
  if (d.invoiceFeeAmount > 0)
    preRows.push({ label: t(lang, "invoiceFee"), value: `${fmtOre(d.invoiceFeeAmount)} ${cur}` })

  // VAT rows per rate (Bokföringslagen: required breakdown by rate)
  // Fall back to a single aggregate row if vatBreakdown is not populated
  const vatRows: Array<{ label: string; value: string }> =
    d.vatBreakdown.length > 0
      ? d.vatBreakdown.map(row => ({
          label: `${t(lang, "vat")} ${row.rate} %`,
          value: `${fmtOre(row.tax)} ${cur}`,
        }))
      : [{ label: t(lang, "vat"), value: `${fmtOre(d.taxAmount)} ${cur}` }]

  return (
    // wrap={false} keeps the entire summary block on one page
    <View style={S.totalsWrap} wrap={false}>
      <View style={S.totalsBox}>

        {/* Pre-VAT rows */}
        {preRows.map(({ label, value }) => (
          <View key={label} style={S.totalRow}>
            <Text style={S.totalLabel}>{label}</Text>
            <Text style={S.totalValue}>{value}</Text>
          </View>
        ))}

        {/* VAT rows (per-rate breakdown) */}
        {vatRows.map(({ label, value }) => (
          <View key={label} style={S.totalRow}>
            <Text style={S.totalLabel}>{label}</Text>
            <Text style={S.totalValue}>{value}</Text>
          </View>
        ))}

        {/* Rounding */}
        {d.roundingAmount !== 0 && (
          <View style={S.totalRow}>
            <Text style={S.totalLabel}>{t(lang, "rounding")}</Text>
            <Text style={S.totalValue}>{fmtOre(d.roundingAmount)}</Text>
          </View>
        )}

        {/* Grand total */}
        <View style={S.grandBox}>
          <Text style={S.grandLabel}>{t(lang, "toPay")}</Text>
          <Text style={S.grandValue}>{fmtOre(d.totalAmount)} {cur}</Text>
        </View>

        {/* VAT base breakdown table (small, under total) */}
        {d.vatBreakdown.length > 0 && (
          <View style={{ marginTop: 8, borderTopWidth: 0.3, borderColor: "#e5e7eb", paddingTop: 5 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={[S.totalLabel, { flex: 1 }]}>{t(lang, "vat")} %</Text>
              <Text style={[S.totalLabel, { flex: 2, textAlign: "right" }]}>{t(lang, "subtotal")}</Text>
              <Text style={[S.totalLabel, { flex: 2, textAlign: "right" }]}>{t(lang, "vat")}</Text>
            </View>
            {d.vatBreakdown.map((row) => (
              <View key={row.rate} style={{ flexDirection: "row", marginTop: 2 }}>
                <Text style={[S.totalValue, { flex: 1 }]}>{row.rate} %</Text>
                <Text style={[S.totalValue, { flex: 2, textAlign: "right" }]}>{fmtOre(row.base)}</Text>
                <Text style={[S.totalValue, { flex: 2, textAlign: "right" }]}>{fmtOre(row.tax)}</Text>
              </View>
            ))}
          </View>
        )}

      </View>
    </View>
  )
}
