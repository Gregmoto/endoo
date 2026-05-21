import React from "react"
import { View, Text, Image } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { PDF_COLORS } from "@/lib/pdf/colors"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { t } from "@/lib/pdf/i18n/invoice"

// ─── Type badge (for non-standard invoice types) ────────────────────────────

const TYPE_BADGE: Record<string, { bg: string; fg: string }> = {
  credit_note:      { bg: PDF_COLORS.destructive, fg: "#ffffff" },
  reminder:         { bg: PDF_COLORS.warning,     fg: "#ffffff" },
  interest_invoice: { bg: PDF_COLORS.warning,     fg: "#ffffff" },
  proforma:         { bg: PDF_COLORS.textMuted,   fg: "#ffffff" },
  cash_invoice:     { bg: PDF_COLORS.text,        fg: "#ffffff" },
}

function docTitle(type: string, lang: "sv" | "en"): string {
  switch (type) {
    case "credit_note":      return t(lang, "creditNote").toUpperCase()
    case "proforma":         return t(lang, "proforma").toUpperCase()
    case "cash_invoice":     return t(lang, "cashInvoice").toUpperCase()
    case "interest_invoice": return t(lang, "interestInvoice").toUpperCase()
    case "reminder":         return t(lang, "reminderInvoice").toUpperCase()
    default:                 return t(lang, "invoice").toUpperCase()
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  d: Pick<InvoicePdfData,
    "lang" | "invoiceType" | "invoiceNumber" | "issueDate" | "dueDate" |
    "deliveryDate" | "customerNumber" | "pdfLogoUrl" | "template" | "brandingColor">
}

export function InvoicePdfHeader({ d }: Props) {
  const { lang }    = d
  const accent      = d.brandingColor ?? PDF_COLORS.brand
  const logoUrl     = d.template.showLogo ? (d.template.logoUrl ?? d.pdfLogoUrl) : null
  const title       = docTitle(d.invoiceType, lang)
  const badge       = TYPE_BADGE[d.invoiceType]
  const isStandard  = d.invoiceType === "invoice"
  const showDueDate = d.invoiceType !== "cash_invoice"

  return (
    <View style={S.section}>

      {/* ── Top row: logo + title + meta ── */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>

        {/* Left: logo zone */}
        <View style={{ flex: 1 }}>
          {logoUrl && (
            <Image
              src={logoUrl}
              style={{ maxHeight: 44, maxWidth: 130, objectFit: "contain", objectPositionX: "left", objectPositionY: "top" }}
            />
          )}
        </View>

        {/* Right: title + meta grid */}
        <View style={{ alignItems: "flex-end" }}>

          {/* Document title */}
          <Text style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 18, color: accent }}>
            {title}
          </Text>

          {/* Type badge for non-standard types */}
          {!isStandard && badge && (
            <View style={{
              backgroundColor: badge.bg,
              borderRadius: 3,
              paddingTop: 2,
              paddingBottom: 2,
              paddingLeft: 6,
              paddingRight: 6,
              marginTop: 4,
              alignSelf: "flex-end",
            }}>
              <Text style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 6.5, color: badge.fg, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {title}
              </Text>
            </View>
          )}

          {/* Meta grid */}
          <View style={{ flexDirection: "row", marginTop: isStandard ? 10 : 6 }}>

            {d.customerNumber && (
              <View style={{ marginLeft: 20, alignItems: "flex-end" }}>
                <Text style={S.label}>{t(lang, "customerNumber")}</Text>
                <Text style={S.valueBold}>{d.customerNumber}</Text>
              </View>
            )}

            <View style={{ marginLeft: 20, alignItems: "flex-end" }}>
              <Text style={S.label}>{t(lang, "date")}</Text>
              <Text style={S.value}>{d.issueDate}</Text>
            </View>

            <View style={{ marginLeft: 20, alignItems: "flex-end" }}>
              <Text style={S.label}>{t(lang, "invoiceNumber")}</Text>
              <Text style={S.valueBold}>{d.invoiceNumber}</Text>
            </View>

            <View style={{ marginLeft: 20, alignItems: "flex-end" }}>
              <Text style={S.label}>{t(lang, "page")}</Text>
              <Text
                style={S.value}
                render={({ pageNumber, totalPages }) => `${pageNumber} ${t(lang, "of")} ${totalPages}`}
              />
            </View>
          </View>

          {/* Due date — prominent */}
          {showDueDate && (
            <View style={{ marginTop: 8, alignItems: "flex-end" }}>
              <Text style={S.label}>{t(lang, "dueDate")}</Text>
              <Text style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 10, color: PDF_COLORS.heading }}>
                {d.dueDate}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Accent line ── */}
      <View style={{ height: 1.5, backgroundColor: accent, marginTop: 14 }} />

    </View>
  )
}
