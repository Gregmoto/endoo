import type { InvoicePdfData, InvoiceTemplateData } from "./templates/invoice/InvoicePdfTypes"

export type SampleInvoiceType = "invoice" | "credit_note" | "proforma" | "interest_invoice" | "reminder"

export const SAMPLE_LINES: InvoicePdfData["lines"] = [
  {
    articleNumber: "DB-KILLER",
    description:   "G.P.R DB-KILLER GPR/UNIVERSAL 50x130x20",
    quantity:      1,
    deliveredQty:  1,
    unit:          "st",
    unitPrice:     13200,
    discountRate:  0,
    lineTotal:     13200,
    isInfoRow:     false,
  },
  {
    articleNumber: null,
    description:   "AVSER ORDER: 131990 — Kenneth Johansson",
    quantity:      0,
    deliveredQty:  null,
    unit:          "",
    unitPrice:     0,
    discountRate:  0,
    lineTotal:     0,
    isInfoRow:     true,
  },
]

export function buildSampleInvoice(
  invoiceType: SampleInvoiceType,
  template:    InvoiceTemplateData,
  swishQrDataUrl: string | null,
  lang: "sv" | "en" = "sv"
): InvoicePdfData {
  return {
    lang,
    invoiceType,
    invoiceNumber:   "FV-2026-0001",
    issueDate:       "2026-05-18",
    dueDate:         "2026-06-17",
    currency:        "SEK",
    orgName:         "Endoo AB",
    pdfLogoUrl:      null,
    template,
    customerNumber:  "BM0518",
    contactVatNumber: "SE556213507801",
    billingName:     "Greg Moto AB",
    billingLines:    ["Maskinvägen 1", "245 34 Staffanstorp"],
    hasDeliveryAddress: true,
    deliveryName:    "Kenneth Johansson",
    deliveryLines:   ["Västra Hunghult 4", "515 93 Seglora"],
    yourReference:   "Gregor",
    ourReference:    "Olow Bergsten",
    shipmentMark:    "46600",
    yourOrderNumber: "131990",
    paymentTermsDays: 30,
    paymentTermsName: "30 dagar netto",
    ocr:             "202600013",
    deliveryDate:    "2026-05-18",
    brandingColor:   "#3b55e6",
    lines:           SAMPLE_LINES,
    notes:           null,
    subtotalAmount:  13200,
    freightAmount:   10000,
    invoiceFeeAmount: 0,
    vatBreakdown:    [{ rate: 25, base: 23200, tax: 5800 }],
    taxAmount:       5800,
    roundingAmount:  0,
    totalAmount:     29000,
    interestRatePercent: 18,
    swishQrDataUrl,
  }
}
