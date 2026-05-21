import React from "react"
import { View, Text, Image } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

function fmtOre(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface PayItemProps {
  label: string
  value: string
}

function PayItem({ label, value }: PayItemProps) {
  return (
    <View style={S.paymentItem}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.valueBold}>{value}</Text>
    </View>
  )
}

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "template" | "ocr" | "currency" | "totalAmount" |
    "invoiceNumber" | "swishQrDataUrl">
}

export function InvoicePdfPaymentBox({ d }: Props) {
  const { lang, template: tmpl } = d

  const hasAnyPayment = tmpl.bankgiro || tmpl.plusgiro || tmpl.iban || tmpl.bic || d.ocr
  const showSwish = !!(tmpl.showSwishQr && tmpl.swishNumber && d.swishQrDataUrl)

  if (!hasAnyPayment && !showSwish) return null

  return (
    <View style={S.paymentBox} wrap={false}>

      {/* Section label */}
      <Text style={[S.label, { fontSize: 7, letterSpacing: 0.6, marginBottom: 6 }]}>
        {lang === "sv" ? "Betalningsinformation" : "Payment information"}
      </Text>

      {/* OCR — largest / most prominent */}
      {d.ocr && (
        <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 6 }}>
          <Text style={S.label}>OCR</Text>
          <Text style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 11, color: PDF_COLORS.heading, marginLeft: 8 }}>
            {d.ocr}
          </Text>
        </View>
      )}

      {/* Payment details grid */}
      <View style={S.paymentGrid}>
        {tmpl.bankgiro && <PayItem label={t(lang, "bankgiro")} value={tmpl.bankgiro} />}
        {tmpl.plusgiro && <PayItem label={t(lang, "plusgiro")} value={tmpl.plusgiro} />}
        {tmpl.iban     && <PayItem label={t(lang, "iban")}     value={tmpl.iban} />}
        {tmpl.bic      && <PayItem label={t(lang, "bic")}      value={tmpl.bic} />}
      </View>

      {/* Swish QR + details */}
      {showSwish && (
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 8 }}>
          <Image src={d.swishQrDataUrl!} style={{ width: 60, height: 60 }} />
          <View style={{ marginLeft: 10, justifyContent: "center" }}>
            <Text style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 8, color: PDF_COLORS.text, marginBottom: 3 }}>
              {t(lang, "swishPay")}
            </Text>
            <Text style={S.valueSm}>{t(lang, "swishNumber")}: {tmpl.swishNumber}</Text>
            <Text style={S.valueSm}>{t(lang, "amount")}: {fmtOre(d.totalAmount)} {d.currency}</Text>
            <Text style={S.valueSm}>{t(lang, "message")}: {d.invoiceNumber}</Text>
          </View>
        </View>
      )}

    </View>
  )
}
