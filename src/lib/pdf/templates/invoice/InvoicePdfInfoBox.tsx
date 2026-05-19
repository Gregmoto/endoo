import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { PDF_COLORS } from "@/lib/pdf/colors"

interface Props {
  text: string
}

export function InvoicePdfInfoBox({ text }: Props) {
  return (
    <View style={{
      marginBottom: 12,
      padding: 8,
      borderWidth: 0.5,
      borderColor: PDF_COLORS.border,
      backgroundColor: PDF_COLORS.surface,
    }}>
      <Text style={{ fontSize: 8, color: PDF_COLORS.text, lineHeight: 1.5, textAlign: "center" }}>
        {text}
      </Text>
    </View>
  )
}
