import React from "react"
import { View, Text, Image } from "@react-pdf/renderer"
import { PDF_COLORS } from "@/lib/pdf/colors"
import { t, type InvoiceLang } from "@/lib/pdf/i18n/invoice"

interface Props {
  qrDataUrl:    string
  swishNumber:  string
  totalAmount:  number
  invoiceNumber: string
  lang:         InvoiceLang
}

export function InvoicePdfSwishQr({ qrDataUrl, swishNumber, totalAmount, invoiceNumber, lang }: Props) {
  const amount = (totalAmount / 100).toFixed(2)

  return (
    <View style={{ marginTop: 12, flexDirection: "row", alignItems: "flex-start" }}>
      <Image src={qrDataUrl} style={{ width: 80, height: 80 }} />
      <View style={{ marginLeft: 10, justifyContent: "center" }}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: PDF_COLORS.text, marginBottom: 4 }}>
          {t(lang, "swishPay")}
        </Text>
        <Text style={{ fontSize: 8, color: PDF_COLORS.textMuted, marginBottom: 2 }}>
          {t(lang, "swishNumber")}: {swishNumber}
        </Text>
        <Text style={{ fontSize: 8, color: PDF_COLORS.textMuted, marginBottom: 2 }}>
          {t(lang, "amount")}: {amount} kr
        </Text>
        <Text style={{ fontSize: 8, color: PDF_COLORS.textMuted }}>
          {t(lang, "message")}: {invoiceNumber}
        </Text>
      </View>
    </View>
  )
}
