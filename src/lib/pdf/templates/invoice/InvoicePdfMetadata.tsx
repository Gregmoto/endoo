import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "yourReference" | "ourReference" | "shipmentMark" |
    "yourOrderNumber" | "paymentTermsDays" | "contactVatNumber" | "template">
}

export function InvoicePdfMetadata({ d }: Props) {
  const lang = d.lang

  // Collect reference columns (only non-empty)
  const refCols: Array<{ label: string; value: string }> = []
  if (d.yourReference)   refCols.push({ label: t(lang, "yourReference"),  value: d.yourReference })
  if (d.shipmentMark)    refCols.push({ label: t(lang, "shipmentMark"),   value: d.shipmentMark })
  if (d.ourReference)    refCols.push({ label: t(lang, "ourReference"),   value: d.ourReference })
  if (d.yourOrderNumber) refCols.push({ label: t(lang, "orderNumber"),    value: d.yourOrderNumber })

  const paymentTermsText = d.paymentTermsDays != null
    ? `${d.paymentTermsDays} dagar netto`
    : null

  const hasVatRow = d.contactVatNumber || d.template.fScattCertified || paymentTermsText

  if (refCols.length === 0 && !hasVatRow) return null

  return (
    <View style={[S.section, {
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderColor: PDF_COLORS.border,
      paddingTop: 6,
      paddingBottom: 6,
    }]}>

      {/* Row 1: reference columns */}
      {refCols.length > 0 && (
        <View style={{ flexDirection: "row", marginBottom: hasVatRow ? 8 : 0 }}>
          {refCols.map(({ label, value }) => (
            <View key={label} style={{ flex: 1, paddingRight: 8 }}>
              <Text style={S.label}>{label}</Text>
              <Text style={S.value}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Row 2: VAT, F-skatt, payment terms */}
      {hasVatRow && (
        <View style={{ flexDirection: "row" }}>
          {d.contactVatNumber && (
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={S.label}>{t(lang, "vatNumber")}</Text>
              <Text style={S.value}>{d.contactVatNumber}</Text>
            </View>
          )}
          {d.template.fScattCertified && (
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[S.value, { color: PDF_COLORS.textMuted, fontFamily: "Helvetica-Oblique" }]}>
                {t(lang, "fScattApproved")}
              </Text>
            </View>
          )}
          {paymentTermsText && (
            <View style={{ flex: 2 }}>
              <Text style={S.label}>{t(lang, "paymentTerms")}</Text>
              <Text style={S.value}>{paymentTermsText.toUpperCase()}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
