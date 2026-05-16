/**
 * Invoice PDF document built with @react-pdf/renderer.
 * Rendered server-side in the /api/invoices/[id]/pdf route.
 */

import React from "react"
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer"

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page:       { fontSize: 10, fontFamily: "Helvetica", color: "#111827", padding: "40 50" },
  row:        { flexDirection: "row" },
  col:        { flex: 1 },

  // Header
  header:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  orgName:    { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#4f46e5" },
  invLabel:   { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111827", textAlign: "right" },
  invNumber:  { fontSize: 11, color: "#6b7280", textAlign: "right" },

  // Meta grid
  metaRow:    { flexDirection: "row", gap: 24, marginBottom: 28 },
  metaBlock:  { flex: 1 },
  metaLabel:  { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  metaValue:  { fontSize: 11, fontFamily: "Helvetica-Bold" },
  metaDue:    { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#dc2626" },

  // Table
  tableHead:  { flexDirection: "row", backgroundColor: "#f9fafb", padding: "7 10", borderBottomWidth: 1, borderColor: "#e5e7eb" },
  tableRow:   { flexDirection: "row", padding: "7 10", borderBottomWidth: 1, borderColor: "#f3f4f6" },
  thText:     { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Helvetica-Bold" },
  tdText:     { fontSize: 10, color: "#111827" },
  tdMuted:    { fontSize: 10, color: "#6b7280" },
  tdBold:     { fontSize: 10, fontFamily: "Helvetica-Bold" },

  // Totals
  totalsArea: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  totalsBox:  { width: 200 },
  totalRow:   { flexDirection: "row", justifyContent: "space-between", padding: "4 0" },
  totalLabel: { fontSize: 10, color: "#6b7280" },
  totalValue: { fontSize: 10, textAlign: "right" },
  grandRow:   { flexDirection: "row", justifyContent: "space-between", padding: "8 0", borderTopWidth: 1, borderColor: "#e5e7eb", marginTop: 4 },
  grandLabel: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },

  // Notes
  notesBox:   { marginTop: 28, padding: "12 14", backgroundColor: "#f9fafb", borderRadius: 4 },
  notesLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  notesText:  { fontSize: 10, color: "#374151", lineHeight: 1.5 },

  // Footer
  footer:     { position: "absolute", bottom: 28, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#9ca3af" },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  return `${(n / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoicePdfData = {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  currency: string
  orgName: string
  orgAddress?: string | null
  orgEmail?: string | null
  orgVatNumber?: string | null
  contactName: string
  contactAddress?: string | null
  notes?: string | null
  reference?: string | null
  lines: Array<{
    description: string
    quantity: number
    unit: string
    unitPrice: number     // öre
    taxRate: number       // 0.25 = 25%
    discountRate: number  // 0.10 = 10%
    total: number         // öre, inkl moms
  }>
  subtotalAmount:  number  // öre, excl moms
  taxAmount:       number  // öre
  discountAmount:  number  // öre
  totalAmount:     number  // öre, inkl moms
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function InvoicePdf({ d }: { d: InvoicePdfData }) {
  const hasDiscount = d.discountAmount > 0

  return (
    <Document title={`Faktura ${d.invoiceNumber}`} author={d.orgName}>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.orgName}>{d.orgName}</Text>
            {d.orgAddress && <Text style={{ fontSize: 9, color: "#6b7280", marginTop: 3 }}>{d.orgAddress}</Text>}
            {d.orgEmail   && <Text style={{ fontSize: 9, color: "#6b7280" }}>{d.orgEmail}</Text>}
            {d.orgVatNumber && <Text style={{ fontSize: 9, color: "#6b7280" }}>Moms: {d.orgVatNumber}</Text>}
          </View>
          <View>
            <Text style={s.invLabel}>FAKTURA</Text>
            <Text style={s.invNumber}>{d.invoiceNumber}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Faktureras till</Text>
            <Text style={s.metaValue}>{d.contactName}</Text>
            {d.contactAddress && <Text style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>{d.contactAddress}</Text>}
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Fakturadatum</Text>
            <Text style={s.metaValue}>{d.issueDate}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Förfallodatum</Text>
            <Text style={s.metaDue}>{d.dueDate}</Text>
          </View>
          {d.reference && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Er referens</Text>
              <Text style={s.metaValue}>{d.reference}</Text>
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
        {d.lines.map((l, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.tdText, { flex: 4 }]}>{l.description}</Text>
            <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>{l.quantity}</Text>
            <Text style={[s.tdMuted, { flex: 1 }]}>{l.unit}</Text>
            <Text style={[s.tdText, { flex: 2, textAlign: "right" }]}>{fmt(l.unitPrice, d.currency)}</Text>
            <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>{Math.round(l.taxRate * 100)}%</Text>
            <Text style={[s.tdBold, { flex: 2, textAlign: "right" }]}>{fmt(l.total, d.currency)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsArea}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Netto</Text>
              <Text style={s.totalValue}>{fmt(d.subtotalAmount, d.currency)}</Text>
            </View>
            {hasDiscount && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: "#059669" }]}>Rabatt</Text>
                <Text style={[s.totalValue, { color: "#059669" }]}>−{fmt(d.discountAmount, d.currency)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Moms</Text>
              <Text style={s.totalValue}>{fmt(d.taxAmount, d.currency)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Totalt</Text>
              <Text style={s.grandValue}>{fmt(d.totalAmount, d.currency)}</Text>
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

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{d.orgName}</Text>
          <Text style={s.footerText}>{d.invoiceNumber}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Sida ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
