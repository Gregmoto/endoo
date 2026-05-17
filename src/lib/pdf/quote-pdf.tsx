/**
 * Quote PDF document built with @react-pdf/renderer.
 * Rendered server-side in the /api/quotes/[id]/pdf route.
 */

import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

function buildStyles(primaryColor: string) {
  return StyleSheet.create({
    page:       { fontSize: 10, fontFamily: "Helvetica", color: "#111827", padding: "40 50" },
    row:        { flexDirection: "row" },

    header:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
    orgName:    { fontSize: 18, fontFamily: "Helvetica-Bold", color: primaryColor },
    docLabel:   { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111827", textAlign: "right" },
    docNumber:  { fontSize: 11, color: "#6b7280", textAlign: "right" },

    metaRow:    { flexDirection: "row", gap: 24, marginBottom: 28 },
    metaBlock:  { flex: 1 },
    metaLabel:  { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
    metaValue:  { fontSize: 11, fontFamily: "Helvetica-Bold" },
    metaExpiry: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#d97706" },

    tableHead:  { flexDirection: "row", backgroundColor: "#f9fafb", padding: "7 10", borderBottomWidth: 1, borderColor: "#e5e7eb" },
    tableRow:   { flexDirection: "row", padding: "7 10", borderBottomWidth: 1, borderColor: "#f3f4f6" },
    thText:     { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Helvetica-Bold" },
    tdText:     { fontSize: 10, color: "#111827" },
    tdMuted:    { fontSize: 10, color: "#6b7280" },
    tdBold:     { fontSize: 10, fontFamily: "Helvetica-Bold" },

    totalsArea: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
    totalsBox:  { width: 200 },
    totalRow:   { flexDirection: "row", justifyContent: "space-between", padding: "4 0" },
    totalLabel: { fontSize: 10, color: "#6b7280" },
    totalValue: { fontSize: 10, textAlign: "right" },
    grandRow:   { flexDirection: "row", justifyContent: "space-between", padding: "8 0", borderTopWidth: 1, borderColor: "#e5e7eb", marginTop: 4 },
    grandLabel: { fontSize: 13, fontFamily: "Helvetica-Bold" },
    grandValue: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },

    notesBox:   { marginTop: 28, padding: "12 14", backgroundColor: "#f9fafb", borderRadius: 4 },
    notesLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    notesText:  { fontSize: 10, color: "#374151", lineHeight: 1.5 },

    approvalNote: { marginTop: 20, padding: "10 14", backgroundColor: "#eff6ff", borderRadius: 4, borderWidth: 1, borderColor: "#bfdbfe" },
    approvalText: { fontSize: 9, color: "#1e40af", textAlign: "center" },

    footer:     { position: "absolute", bottom: 28, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: "#9ca3af" },
  })
}

function fmt(n: number, currency: string) {
  return `${n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

export type QuotePdfBranding = {
  primaryColor?:  string | null
  pdfFooterText?: string | null
  displayName?:   string | null
}

export type QuotePdfLine = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

export type QuotePdfData = {
  branding?:     QuotePdfBranding
  quoteNumber:   string
  issueDate:     string
  validUntil?:   string | null
  currency:      string
  orgName:       string
  orgAddress?:   string | null
  orgEmail?:     string | null
  orgVatNumber?: string | null
  contactName:   string
  contactAddress?: string | null
  title?:        string | null
  notes?:        string | null
  terms?:        string | null
  approvalUrl?:  string | null
  lines:         QuotePdfLine[]
  subtotalKr:    number
  taxKr:         number
  discountKr:    number
  totalKr:       number
}

export function QuotePdf({ d }: { d: QuotePdfData }) {
  const branding     = d.branding ?? {}
  const primaryColor = branding.primaryColor ?? "#4f46e5"
  const s            = buildStyles(primaryColor)
  const hasDiscount  = d.discountKr > 0
  const cur          = d.currency

  return (
    <Document title={`OFFERT ${d.quoteNumber}`} author={d.orgName}>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.orgName}>{d.orgName}</Text>
            {d.orgAddress   && <Text style={{ fontSize: 9, color: "#6b7280", marginTop: 3 }}>{d.orgAddress}</Text>}
            {d.orgEmail     && <Text style={{ fontSize: 9, color: "#6b7280" }}>{d.orgEmail}</Text>}
            {d.orgVatNumber && <Text style={{ fontSize: 9, color: "#6b7280" }}>Moms: {d.orgVatNumber}</Text>}
          </View>
          <View>
            <Text style={s.docLabel}>OFFERT</Text>
            <Text style={s.docNumber}>{d.quoteNumber}</Text>
            {d.title && <Text style={{ fontSize: 9, color: "#6b7280", textAlign: "right", marginTop: 4 }}>{d.title}</Text>}
          </View>
        </View>

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Offert till</Text>
            <Text style={s.metaValue}>{d.contactName}</Text>
            {d.contactAddress && <Text style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>{d.contactAddress}</Text>}
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Offertdatum</Text>
            <Text style={s.metaValue}>{d.issueDate}</Text>
          </View>
          {d.validUntil && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Giltig till</Text>
              <Text style={s.metaExpiry}>{d.validUntil}</Text>
            </View>
          )}
        </View>

        {/* Table header */}
        <View style={s.tableHead}>
          <Text style={[s.thText, { flex: 4 }]}>Beskrivning</Text>
          <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>Antal</Text>
          <Text style={[s.thText, { flex: 1 }]}>Enhet</Text>
          <Text style={[s.thText, { flex: 2, textAlign: "right" }]}>À-pris</Text>
          <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>Moms</Text>
          <Text style={[s.thText, { flex: 2, textAlign: "right" }]}>Summa</Text>
        </View>

        {/* Table rows */}
        {d.lines.map((l, i) => {
          const net   = l.quantity * l.unitPriceKr * (1 - l.discountRate)
          const total = net * (1 + l.taxRate)
          return (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tdText, { flex: 4 }]}>{l.description}</Text>
              <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>{l.quantity}</Text>
              <Text style={[s.tdMuted, { flex: 1 }]}>{l.unit}</Text>
              <Text style={[s.tdText, { flex: 2, textAlign: "right" }]}>{fmt(l.unitPriceKr, cur)}</Text>
              <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>{Math.round(l.taxRate * 100)}%</Text>
              <Text style={[s.tdBold, { flex: 2, textAlign: "right" }]}>{fmt(total, cur)}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={s.totalsArea}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Netto</Text>
              <Text style={s.totalValue}>{fmt(d.subtotalKr, cur)}</Text>
            </View>
            {hasDiscount && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: "#059669" }]}>Rabatt</Text>
                <Text style={[s.totalValue, { color: "#059669" }]}>−{fmt(d.discountKr, cur)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Moms</Text>
              <Text style={s.totalValue}>{fmt(d.taxKr, cur)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Totalt</Text>
              <Text style={s.grandValue}>{fmt(d.totalKr, cur)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {d.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Meddelande</Text>
            <Text style={s.notesText}>{d.notes}</Text>
          </View>
        )}

        {/* Terms */}
        {d.terms && (
          <View style={[s.notesBox, { marginTop: 12, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#e5e7eb" }]}>
            <Text style={s.notesLabel}>Villkor</Text>
            <Text style={s.notesText}>{d.terms}</Text>
          </View>
        )}

        {/* Approval URL */}
        {d.approvalUrl && (
          <View style={s.approvalNote}>
            <Text style={s.approvalText}>Godkänn online: {d.approvalUrl}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{d.orgName}</Text>
          <Text style={s.footerText}>{d.quoteNumber}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Sida ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
