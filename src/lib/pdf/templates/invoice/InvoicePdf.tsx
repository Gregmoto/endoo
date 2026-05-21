import React from "react"
import { Document, Page, View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import { registerInvoiceFonts } from "./fonts"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { InvoicePdfHeader }        from "./InvoicePdfHeader"
import { InvoicePdfAddresses }     from "./InvoicePdfAddresses"
import { InvoicePdfMetadata }      from "./InvoicePdfMetadata"
import { InvoicePdfLineItemsTable } from "./InvoicePdfLineItemsTable"
import { InvoicePdfInfoBox }       from "./InvoicePdfInfoBox"
import { InvoicePdfInterestNotice } from "./InvoicePdfInterestNotice"
import { InvoicePdfSummary }       from "./InvoicePdfSummary"
import { InvoicePdfPaymentBox }    from "./InvoicePdfPaymentBox"
import { InvoicePdfPageFooter }    from "./InvoicePdfPageFooter"

// Register Inter at module load — idempotent, safe to call multiple times
registerInvoiceFonts()

export type { InvoicePdfData }

interface Props {
  d: InvoicePdfData
}

export function InvoicePdf({ d }: Props) {
  const showInterest = !!(
    d.interestRatePercent &&
    d.interestRatePercent > 0 &&
    d.invoiceType !== "cash_invoice"
  )

  return (
    <Document
      title={d.invoiceNumber}
      author={d.orgName}
      language={d.lang}
    >
      <Page size="A4" style={S.page}>

        {/* Header — logo, document type, meta grid, due date, accent line */}
        <InvoicePdfHeader d={d} />

        {/* Addresses — billing (always) + delivery (if present) */}
        <InvoicePdfAddresses d={d} />

        {/* Metadata band — references, payment terms, delivery date */}
        <InvoicePdfMetadata d={d} />

        {/* Notes (before line items) */}
        {d.notes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={[S.label, { marginBottom: 3 }]}>
              {d.lang === "sv" ? "Meddelande" : "Message"}
            </Text>
            <Text style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 9, lineHeight: 1.5 }}>
              {d.notes}
            </Text>
          </View>
        )}

        {/* Line items table */}
        <InvoicePdfLineItemsTable d={d} />

        {/* Info box (org's custom footer text) */}
        {d.template.footerText && <InvoicePdfInfoBox text={d.template.footerText} />}

        {/* Interest rate notice */}
        {showInterest && (
          <InvoicePdfInterestNotice ratePercent={d.interestRatePercent!} lang={d.lang} />
        )}

        {/* Summary: subtotal, VAT per rate, rounding, grand total */}
        <InvoicePdfSummary d={d} />

        {/* Payment box: OCR, BG, PG, IBAN/BIC, Swish QR */}
        <InvoicePdfPaymentBox d={d} />

        {/* Fixed footer — repeats on every page */}
        <InvoicePdfPageFooter template={d.template} lang={d.lang} orgName={d.orgName} />

      </Page>
    </Document>
  )
}
