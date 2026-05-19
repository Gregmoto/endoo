import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoiceTemplateData } from "./InvoicePdfTypes"
import { t, type InvoiceLang } from "@/lib/pdf/i18n/invoice"

interface Props {
  template: InvoiceTemplateData
  lang:     InvoiceLang
}

export function InvoicePdfPageFooter({ template: tmpl, lang }: Props) {
  // Sub-line below columns
  const subParts: string[] = []
  if (tmpl.boardSeat)      subParts.push(`Styrelsens säte: ${tmpl.boardSeat}`)
  if (tmpl.fScattCertified) subParts.push(t(lang, "fScattApproved"))
  if (tmpl.email)          subParts.push(`${t(lang, "email")}: ${tmpl.email}`)
  if (tmpl.website)        subParts.push(`Web: ${tmpl.website}`)

  // Determine non-empty columns so we don't render blank ones
  const col1Lines = tmpl.postalAddress ? tmpl.postalAddress.split("\n") : []
  const col2Lines = tmpl.streetAddress ? [tmpl.streetAddress] : []
  const col3Lines: string[] = []
  if (tmpl.phone) col3Lines.push(`${t(lang, "phone")}: ${tmpl.phone}`)
  if (tmpl.fax)   col3Lines.push(`Fax: ${tmpl.fax}`)
  const col4Lines: string[] = []
  if (tmpl.bankgiro) col4Lines.push(`${t(lang, "bankgiro")}: ${tmpl.bankgiro}`)
  if (tmpl.plusgiro) col4Lines.push(`${t(lang, "plusgiro")}: ${tmpl.plusgiro}`)
  if (tmpl.bic)      col4Lines.push(`BIC: ${tmpl.bic}`)
  if (tmpl.iban)     col4Lines.push(`IBAN: ${tmpl.iban}`)

  const cols = [col1Lines, col2Lines, col3Lines, col4Lines].filter(c => c.length > 0)
  if (cols.length === 0 && subParts.length === 0) return null

  return (
    <View style={S.pageFooter} fixed>
      {/* 4-col content */}
      {cols.length > 0 && (
        <View style={{ flexDirection: "row", marginBottom: subParts.length > 0 ? 3 : 0 }}>
          {cols.map((lines, ci) => (
            <View key={ci} style={S.footerCol}>
              {lines.map((line, li) => (
                <Text key={li} style={S.footerText}>{line}</Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Sub-line */}
      {subParts.length > 0 && (
        <Text style={[S.footerText, { color: PDF_COLORS.textMuted }]}>
          {subParts.join("  ·  ")}
        </Text>
      )}
    </View>
  )
}
