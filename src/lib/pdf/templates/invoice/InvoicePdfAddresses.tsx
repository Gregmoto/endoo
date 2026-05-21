import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "billingName" | "billingLines" | "contactVatNumber" |
    "hasDeliveryAddress" | "deliveryName" | "deliveryLines">
}

export function InvoicePdfAddresses({ d }: Props) {
  const { lang } = d

  return (
    <View style={[S.section, { flexDirection: "row" }]}>

      {/* Left — delivery address or empty spacer */}
      <View style={{ flex: 1, paddingRight: 16 }}>
        {d.hasDeliveryAddress && (
          <>
            <Text style={[S.label, { marginBottom: 4 }]}>{t(lang, "deliveryAddress")}</Text>
            {d.deliveryName && <Text style={S.value}>{d.deliveryName}</Text>}
            {d.deliveryLines.map((line, i) => (
              <Text key={i} style={S.value}>{line}</Text>
            ))}
          </>
        )}
      </View>

      {/* Right — billing address in a framed "envelope window" box */}
      <View style={{ flex: 1 }}>
        <Text style={[S.label, { marginBottom: 4 }]}>
          {lang === "sv" ? "Faktureras till" : "Invoice to"}
        </Text>
        <View style={{
          borderWidth: 0.5,
          borderColor: PDF_COLORS.border,
          borderRadius: 3,
          padding: 8,
          backgroundColor: PDF_COLORS.background,
        }}>
          {d.billingName && (
            <Text style={S.valueBold}>{d.billingName}</Text>
          )}
          {d.billingLines.map((line, i) => (
            <Text key={i} style={S.value}>{line}</Text>
          ))}
          {d.contactVatNumber && (
            <Text style={[S.valueSm, { marginTop: 3 }]}>
              {t(lang, "vatNumber")}: {d.contactVatNumber}
            </Text>
          )}
        </View>
      </View>

    </View>
  )
}
