import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "billingName" | "billingLines" |
    "hasDeliveryAddress" | "deliveryName" | "deliveryLines">
}

export function InvoicePdfAddresses({ d }: Props) {
  const lang = d.lang

  return (
    <View style={[S.section, { flexDirection: "row" }]}>

      {/* Left — delivery address (only if present) */}
      {d.hasDeliveryAddress && (
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={[S.label, { marginBottom: 4 }]}>{t(lang, "deliveryAddress")}</Text>
          {d.deliveryName && <Text style={S.value}>{d.deliveryName}</Text>}
          {d.deliveryLines.map((line, i) => (
            <Text key={i} style={S.value}>{line}</Text>
          ))}
        </View>
      )}

      {/* Right — billing address (always) */}
      <View style={d.hasDeliveryAddress ? { flex: 1 } : { flex: 1 }}>
        <Text style={[S.label, { marginBottom: 4 }]}>{lang === "sv" ? "Faktureras till" : "Invoiced to"}</Text>
        {d.billingName && (
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0a0d1e" }}>
            {d.billingName}
          </Text>
        )}
        {d.billingLines.map((line, i) => (
          <Text key={i} style={S.value}>{line}</Text>
        ))}
      </View>

      {/* Spacer if no delivery address, to push billing to right */}
      {!d.hasDeliveryAddress && <View style={{ flex: 1 }} />}
    </View>
  )
}
