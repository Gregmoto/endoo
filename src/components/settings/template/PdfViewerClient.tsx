"use client"

import React, { memo } from "react"
import { PDFViewer } from "@react-pdf/renderer"
import { InvoicePdf } from "@/lib/pdf/templates/invoice/InvoicePdf"
import type { InvoicePdfData } from "@/lib/pdf/templates/invoice/InvoicePdfTypes"

interface Props {
  data: InvoicePdfData
}

// Memoized so react-pdf only re-renders when data actually changes
const InvoicePdfMemo = memo(
  ({ d }: { d: InvoicePdfData }) => <InvoicePdf d={d} />,
  (prev, next) => JSON.stringify(prev.d) === JSON.stringify(next.d)
)
InvoicePdfMemo.displayName = "InvoicePdfMemo"

export default function PdfViewerClient({ data }: Props) {
  return (
    <PDFViewer
      width="100%"
      height="100%"
      style={{ border: "none" }}
      showToolbar={false}
    >
      <InvoicePdfMemo d={data} />
    </PDFViewer>
  )
}
