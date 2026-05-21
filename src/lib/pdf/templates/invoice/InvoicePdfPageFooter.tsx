import React from "react"
import { View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import type { InvoiceTemplateData } from "./InvoicePdfTypes"
import type { InvoiceLang } from "@/lib/pdf/i18n/invoice"
import { t } from "@/lib/pdf/i18n/invoice"

interface Props {
  template: InvoiceTemplateData
  lang:     InvoiceLang
  orgName:  string
}

export function InvoicePdfPageFooter({ template: tmpl, lang, orgName }: Props) {
  // Col 1: postal address (org name + address lines)
  const col1: string[] = []
  if (orgName) col1.push(orgName)
  if (tmpl.postalAddress) col1.push(...tmpl.postalAddress.split("\n"))
  if (tmpl.streetAddress)  col1.push(tmpl.streetAddress)

  // Col 2: contact
  const col2: string[] = []
  if (tmpl.phone)   col2.push(`${t(lang, "phone")}: ${tmpl.phone}`)
  if (tmpl.fax)     col2.push(`Fax: ${tmpl.fax}`)
  if (tmpl.email)   col2.push(tmpl.email)
  if (tmpl.website) col2.push(tmpl.website)

  // Col 3: legal identity
  const col3: string[] = []
  if (tmpl.vatNumber)      col3.push(`${t(lang, "iban").includes("IBAN") ? "Momsreg.nr" : "Momsreg.nr"}: ${tmpl.vatNumber}`)
  if (tmpl.boardSeat)      col3.push(`${lang === "sv" ? "Styrelsens säte" : "Registered office"}: ${tmpl.boardSeat}`)
  if (tmpl.fScattCertified) col3.push(t(lang, "fScattApproved"))

  const allEmpty = col1.length === 0 && col2.length === 0 && col3.length === 0
  if (allEmpty) return null

  return (
    <View style={S.pageFooter} fixed>
      <View style={S.footerRow}>
        <View style={S.footerCol}>
          {col1.map((line, i) => (
            <Text key={i} style={i === 0 ? S.footerTextBold : S.footerText}>{line}</Text>
          ))}
        </View>
        <View style={S.footerCol}>
          {col2.map((line, i) => (
            <Text key={i} style={S.footerText}>{line}</Text>
          ))}
        </View>
        <View style={S.footerCol}>
          {col3.map((line, i) => (
            <Text key={i} style={S.footerText}>{line}</Text>
          ))}
        </View>
      </View>
    </View>
  )
}
