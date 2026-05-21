import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { t, type InvoiceLang } from "@/lib/pdf/i18n/invoice"

interface Props {
  ratePercent: number
  lang:        InvoiceLang
}

export function InvoicePdfInterestNotice({ ratePercent, lang }: Props) {
  const rateStr = ratePercent.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const text    = t(lang, "interestNotice").replace("{rate}", rateStr)

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[S.valueSm, { fontStyle: "italic" }]}>{text}</Text>
    </View>
  )
}
