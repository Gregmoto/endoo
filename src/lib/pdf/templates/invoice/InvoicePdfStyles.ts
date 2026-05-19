import { StyleSheet } from "@react-pdf/renderer"
import { PDF_COLORS } from "@/lib/pdf/colors"

export const S = StyleSheet.create({
  page: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: PDF_COLORS.text,
    paddingLeft: 30,
    paddingRight: 30,
    paddingTop: 25,
    paddingBottom: 65,
    backgroundColor: PDF_COLORS.background,
  },

  section: { marginBottom: 16 },
  row:     { flexDirection: "row" },

  // Labels + values
  label: {
    fontSize: 7,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    color: PDF_COLORS.text,
  },
  valueBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
  },

  // Table
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: PDF_COLORS.border,
    paddingBottom: 4,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingTop: 3,
    paddingBottom: 3,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingTop: 3,
    paddingBottom: 3,
    backgroundColor: PDF_COLORS.surface,
  },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tdText:  { fontSize: 9, color: PDF_COLORS.text },
  tdMuted: { fontSize: 8, color: PDF_COLORS.textMuted },

  // Totals
  totalsBox: { marginTop: 8, alignItems: "flex-end" },
  totalsInner: { width: 210 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
    paddingBottom: 2,
  },
  totalRowBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 0.5,
    borderColor: PDF_COLORS.border,
    marginTop: 4,
  },
  totalLabel: { fontSize: 9, color: PDF_COLORS.textMuted },
  totalValue: { fontSize: 9, color: PDF_COLORS.text, textAlign: "right" },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: PDF_COLORS.heading },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: PDF_COLORS.heading, textAlign: "right" },

  // Footer (fixed, every page)
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderColor: PDF_COLORS.border,
    paddingTop: 5,
  },
  footerCol:  { flex: 1 },
  footerText: { fontSize: 7, color: PDF_COLORS.textMuted, marginBottom: 1 },
  footerTextBold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: PDF_COLORS.textMuted, marginBottom: 1 },
})
