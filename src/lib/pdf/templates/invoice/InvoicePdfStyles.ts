import { StyleSheet } from "@react-pdf/renderer"
import { PDF_COLORS } from "@/lib/pdf/colors"

const F = "Inter"

export const S = StyleSheet.create({

  // ─── Page ─────────────────────────────────────────────────────────────────
  page: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 9,
    color: PDF_COLORS.text,
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 28,
    paddingBottom: 78,
    backgroundColor: PDF_COLORS.background,
  },

  section: { marginBottom: 14 },

  // ─── Typography ────────────────────────────────────────────────────────────
  label: {
    fontFamily: F,
    fontWeight: 600,
    fontSize: 6.5,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 9,
    color: PDF_COLORS.text,
  },
  valueBold: {
    fontFamily: F,
    fontWeight: 600,
    fontSize: 9,
    color: PDF_COLORS.text,
  },
  valueSm: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 8,
    color: PDF_COLORS.textMuted,
  },

  // ─── Table header ──────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.surface,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 4,
    paddingRight: 4,
  },
  thText: {
    fontFamily: F,
    fontWeight: 600,
    fontSize: 7,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // ─── Table rows ────────────────────────────────────────────────────────────
  tableRow: {
    flexDirection: "row",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
    borderBottomWidth: 0.3,
    borderColor: PDF_COLORS.border,
  },
  tdText: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 9,
    color: PDF_COLORS.text,
  },
  tdSub: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 7.5,
    color: PDF_COLORS.textMuted,
    marginTop: 1,
  },
  tdNum: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 9,
    color: PDF_COLORS.text,
    textAlign: "right",
  },
  tdNumBold: {
    fontFamily: F,
    fontWeight: 600,
    fontSize: 9,
    color: PDF_COLORS.text,
    textAlign: "right",
  },

  // ─── Totals ────────────────────────────────────────────────────────────────
  totalsWrap:  { marginTop: 12, alignItems: "flex-end" },
  totalsBox:   { width: 234 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2.5,
    paddingBottom: 2.5,
  },
  totalSepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2.5,
    paddingBottom: 2.5,
    borderTopWidth: 0.5,
    borderColor: PDF_COLORS.border,
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 8.5,
    color: PDF_COLORS.textMuted,
  },
  totalValue: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 8.5,
    color: PDF_COLORS.text,
    textAlign: "right",
  },
  grandBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: PDF_COLORS.surface,
    borderRadius: 4,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 12,
    paddingRight: 12,
    marginTop: 6,
  },
  grandLabel: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 10,
    color: PDF_COLORS.heading,
  },
  grandValue: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 13,
    color: PDF_COLORS.heading,
    textAlign: "right",
  },

  // ─── Payment box ───────────────────────────────────────────────────────────
  paymentBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderColor: PDF_COLORS.border,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  paymentItem: {
    marginRight: 28,
    marginBottom: 5,
  },

  // ─── Fixed page footer ─────────────────────────────────────────────────────
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    borderTopWidth: 0.5,
    borderColor: PDF_COLORS.border,
    paddingTop: 6,
  },
  footerRow:  { flexDirection: "row" },
  footerCol:  { flex: 1 },
  footerText: {
    fontFamily: F,
    fontWeight: 400,
    fontSize: 6.5,
    color: PDF_COLORS.textMuted,
    marginBottom: 1.5,
  },
  footerTextBold: {
    fontFamily: F,
    fontWeight: 600,
    fontSize: 6.5,
    color: PDF_COLORS.textMuted,
    marginBottom: 1.5,
  },
})
