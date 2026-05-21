import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { PDF_COLORS } from "@/lib/pdf/colors"
import { S } from "./InvoicePdfStyles"

interface Props {
  text: string
}

export function InvoicePdfInfoBox({ text }: Props) {
  return (
    <View style={{
      marginBottom: 12,
      padding: 10,
      borderWidth: 0.5,
      borderColor: PDF_COLORS.border,
      borderRadius: 3,
      backgroundColor: PDF_COLORS.surface,
    }}>
      <Text style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 8, color: PDF_COLORS.text, lineHeight: 1.55, textAlign: "center" }}>
        {text}
      </Text>
    </View>
  )
}
