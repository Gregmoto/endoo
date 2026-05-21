export type VatBreakdownRow = {
  rate: number  // e.g. 25 for 25%
  base: number  // öre, netto excl tax
  tax:  number  // öre
}

export type InvoicePdfLine = {
  articleNumber:  string | null
  description:    string
  quantity:       number
  deliveredQty:   number | null
  unit:           string
  unitPrice:      number             // öre
  discountRate:   number             // 0–1
  lineTotal:      number             // öre, net excl tax
  isInfoRow:      boolean
  dimensions?:    Array<{ axis: string; value: string }>
}

export type InvoiceTemplateData = {
  logoUrl:         string | null
  showLogo:        boolean
  footerText:      string | null
  postalAddress:   string | null
  streetAddress:   string | null
  phone:           string | null
  fax:             string | null
  bankgiro:        string | null
  plusgiro:        string | null
  iban:            string | null
  bic:             string | null
  email:           string | null
  website:         string | null
  vatNumber:       string | null
  fScattCertified: boolean
  showSwishQr:     boolean
  swishNumber:     string | null
  boardSeat:       string | null
}

export type InvoicePdfData = {
  lang:             "sv" | "en"
  invoiceType:      string
  invoiceNumber:    string
  issueDate:        string
  dueDate:          string
  deliveryDate:     string | null   // Bokföringslagen: required on invoices
  currency:         string
  orgName:          string
  pdfLogoUrl:       string | null
  template:         InvoiceTemplateData
  brandingColor:    string | null   // hex from BrandingProfile.primaryColor
  customerNumber:   string | null
  contactVatNumber: string | null
  billingName:      string | null
  billingLines:     string[]
  hasDeliveryAddress: boolean
  deliveryName:     string | null
  deliveryLines:    string[]
  yourReference:    string | null
  ourReference:     string | null
  shipmentMark:     string | null
  yourOrderNumber:  string | null
  paymentTermsDays: number | null
  paymentTermsName: string | null   // actual name from PaymentTerm table
  ocr:              string | null   // payment reference / OCR number
  lines:            InvoicePdfLine[]
  notes:            string | null
  subtotalAmount:   number
  freightAmount:    number
  invoiceFeeAmount: number
  vatBreakdown:     VatBreakdownRow[]   // per-rate breakdown (Bokföringslagen)
  taxAmount:        number              // total, for fallback if vatBreakdown empty
  roundingAmount:   number
  totalAmount:      number
  interestRatePercent: number | null
  swishQrDataUrl:   string | null
}
