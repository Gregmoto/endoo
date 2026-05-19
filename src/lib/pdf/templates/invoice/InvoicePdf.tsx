import React from "react"
import { Document, Page, View, Text } from "@react-pdf/renderer"
import { S } from "./InvoicePdfStyles"
import type { InvoicePdfData } from "./InvoicePdfTypes"
import { InvoicePdfHeader }         from "./InvoicePdfHeader"
import { InvoicePdfAddresses }      from "./InvoicePdfAddresses"
import { InvoicePdfMetadata }       from "./InvoicePdfMetadata"
import { InvoicePdfLineItemsTable } from "./InvoicePdfLineItemsTable"
import { InvoicePdfInfoBox }        from "./InvoicePdfInfoBox"
import { InvoicePdfInterestNotice } from "./InvoicePdfInterestNotice"
import { InvoicePdfSummary }        from "./InvoicePdfSummary"
import { InvoicePdfSwishQr }        from "./InvoicePdfSwishQr"
import { InvoicePdfPageFooter }     from "./InvoicePdfPageFooter"

export type { InvoicePdfData }

interface Props {
  d: InvoicePdfData
}

export function InvoicePdf({ d }: Props) {
  const showSwish = !!(
    d.template.showSwishQr &&
    d.template.swishNumber &&
    d.swishQrDataUrl
  )

  const showInterest = !!(
    d.interestRatePercent &&
    d.interestRatePercent > 0 &&
    d.invoiceType !== "cash_invoice"
  )

  return (
    <Document
      title={`${d.invoiceNumber}`}
      author={d.orgName}
      language={d.lang}
    >
      <Page size="A4" style={S.page}>

        {/* Header — logo, title, meta grid, due date */}
        <InvoicePdfHeader d={d} />

        {/* Addresses — page 1 only (natural flow) */}
        <InvoicePdfAddresses d={d} />

        {/* Metadata — references, payment terms, VAT */}
        <InvoicePdfMetadata d={d} />

        {/* Notes (if present, before line items) */}
        {d.notes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={[S.label, { marginBottom: 3 }]}>Meddelande</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.5 }}>{d.notes}</Text>
          </View>
        )}

        {/* Line items table */}
        <InvoicePdfLineItemsTable d={d} />

        {/* Info box (template footer text) */}
        {d.template.footerText && <InvoicePdfInfoBox text={d.template.footerText} />}

        {/* Interest notice */}
        {showInterest && (
          <InvoicePdfInterestNotice ratePercent={d.interestRatePercent!} lang={d.lang} />
        )}

        {/* Summary */}
        <InvoicePdfSummary d={d} />

        {/* Swish QR */}
        {showSwish && (
          <InvoicePdfSwishQr
            qrDataUrl={d.swishQrDataUrl!}
            swishNumber={d.template.swishNumber!}
            totalAmount={d.totalAmount}
            invoiceNumber={d.invoiceNumber}
            lang={d.lang}
          />
        )}

        {/* Page footer — fixed, repeats on every page */}
        <InvoicePdfPageFooter template={d.template} lang={d.lang} />

      </Page>
    </Document>
  )
}
