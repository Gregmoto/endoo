import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "yourReference" | "ourReference" | "shipmentMark" |
    "yourOrderNumber" | "paymentTermsDays" | "paymentTermsName" |
    "deliveryDate" | "template">
}

export function InvoicePdfMetadata({ d }: Props) {
  const { lang } = d

  type MetaCol = { label: string; value: string }
  const cols: MetaCol[] = []

  if (d.yourReference)  cols.push({ label: t(lang, "yourReference"),  value: d.yourReference })
  if (d.ourReference)   cols.push({ label: t(lang, "ourReference"),   value: d.ourReference })
  if (d.shipmentMark)   cols.push({ label: t(lang, "shipmentMark"),   value: d.shipmentMark })
  if (d.yourOrderNumber) cols.push({ label: t(lang, "yourOrderNumber"), value: d.yourOrderNumber })

  const paymentTermsText = d.paymentTermsName
    ?? (d.paymentTermsDays != null ? `${d.paymentTermsDays} ${lang === "sv" ? "dagar netto" : "days net"}` : null)

  if (paymentTermsText) cols.push({ label: t(lang, "paymentTerms"), value: paymentTermsText })
  if (d.deliveryDate)   cols.push({ label: t(lang, "deliveryDate"), value: d.deliveryDate })

  const showFSkatt = d.template.fScattCertified

  if (cols.length === 0 && !showFSkatt) return null

  return (
    <View style={[S.section, {
      backgroundColor: PDF_COLORS.surface,
      paddingTop: 6,
      paddingBottom: 6,
      paddingLeft: 8,
      paddingRight: 8,
      borderRadius: 3,
    }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cols.map(({ label, value }) => (
          <View key={label} style={{ marginRight: 24, marginBottom: 2 }}>
            <Text style={S.label}>{label}</Text>
            <Text style={S.value}>{value}</Text>
          </View>
        ))}
        {showFSkatt && (
          <View style={{ marginRight: 24, marginBottom: 2 }}>
            <Text style={S.label}> </Text>
            <Text style={[S.valueSm, { fontStyle: "italic" }]}>
              {t(lang, "fScattApproved")}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
