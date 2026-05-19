import React from "react"
import { View, Text, Image } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

function titleFromType(type: string, lang: "sv" | "en"): string {
  switch (type) {
    case "credit_note":     return t(lang, "creditNote").toUpperCase()
    case "proforma":        return t(lang, "proforma").toUpperCase()
    case "cash_invoice":    return t(lang, "cashInvoice").toUpperCase()
    case "interest_invoice":return t(lang, "interestInvoice").toUpperCase()
    case "reminder":        return t(lang, "reminderInvoice").toUpperCase()
    default:                return t(lang, "invoice").toUpperCase()
  }
}

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "invoiceType" | "invoiceNumber" | "issueDate" | "dueDate" |
    "customerNumber" | "pdfLogoUrl" | "template">
}

export function InvoicePdfHeader({ d }: Props) {
  const lang       = d.lang
  const title      = titleFromType(d.invoiceType, lang)
  const logoUrl    = d.template.showLogo ? (d.template.logoUrl ?? d.pdfLogoUrl) : null

  return (
    <View style={[S.section, { marginBottom: 14 }]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>

        {/* Left — logo */}
        <View style={{ flex: 1 }}>
          {logoUrl && (
            <Image
              src={logoUrl}
              style={{ maxHeight: 55, maxWidth: 150, objectFit: "contain", objectPositionX: "left" }}
            />
          )}
        </View>

        {/* Right — title + meta grid + due date */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: PDF_COLORS.heading }}>
            {title}
          </Text>

          {/* 4-col meta grid */}
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            {d.customerNumber && (
              <View style={{ marginLeft: 16, alignItems: "flex-end" }}>
                <Text style={S.label}>{t(lang, "customerNumber")}</Text>
                <Text style={S.value}>{d.customerNumber}</Text>
              </View>
            )}
            <View style={{ marginLeft: 16, alignItems: "flex-end" }}>
              <Text style={S.label}>{t(lang, "date")}</Text>
              <Text style={S.value}>{d.issueDate}</Text>
            </View>
            <View style={{ marginLeft: 16, alignItems: "flex-end" }}>
              <Text style={S.label}>{t(lang, "invoiceNumber")}</Text>
              <Text style={S.value}>{d.invoiceNumber}</Text>
            </View>
            <View style={{ marginLeft: 16, alignItems: "flex-end" }}>
              <Text style={S.label}>{t(lang, "page")}</Text>
              <Text
                style={S.value}
                render={({ pageNumber, totalPages }) =>
                  `${pageNumber} ${t(lang, "of")} ${totalPages}`
                }
              />
            </View>
          </View>

          {/* Due date emphasized */}
          <View style={{ marginTop: 8, alignItems: "flex-end" }}>
            <Text style={S.label}>{t(lang, "dueDate")}</Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: PDF_COLORS.text }}>
              {d.dueDate}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
