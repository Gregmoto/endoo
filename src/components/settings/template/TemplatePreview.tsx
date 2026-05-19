"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import type { InvoicePdfData } from "@/lib/pdf/templates/invoice/InvoicePdfTypes"
import type { InvoiceTemplateData } from "@/lib/pdf/templates/invoice/InvoicePdfTypes"
import { buildSampleInvoice, type SampleInvoiceType } from "@/lib/pdf/sample-data"
import { TemplatePreviewControls, type ZoomLevel } from "./TemplatePreviewControls"
import type { TemplateFormValues } from "./types"
import QRCode from "qrcode"
import { pdf } from "@react-pdf/renderer"
import React from "react"
import { InvoicePdf } from "@/lib/pdf/templates/invoice/InvoicePdf"

const PdfViewerClient = dynamic(() => import("./PdfViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Laddar förhandsgranskning…</p>
      </div>
    </div>
  ),
})

function formToTemplateData(form: TemplateFormValues): InvoiceTemplateData {
  return {
    logoUrl:         form.logoUrl         || null,
    showLogo:        form.showLogo,
    footerText:      form.footerText      || null,
    postalAddress:   form.postalAddress   || null,
    streetAddress:   form.streetAddress   || null,
    phone:           form.phone           || null,
    fax:             form.fax             || null,
    bankgiro:        form.bankgiro        || null,
    plusgiro:        form.plusgiro        || null,
    iban:            form.iban            || null,
    bic:             form.bic             || null,
    email:           form.email           || null,
    website:         form.website         || null,
    vatNumber:       form.vatNumber       || null,
    fScattCertified: form.fScattCertified,
    showSwishQr:     form.showSwishQr,
    swishNumber:     form.swishNumber     || null,
    boardSeat:       form.boardSeat       || null,
  }
}

const ZOOM_LS_KEY = "invoice-template-preview-zoom"

interface Props {
  form: TemplateFormValues
}

export function TemplatePreview({ form }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>(() => {
    if (typeof window === "undefined") return 100
    const stored = localStorage.getItem(ZOOM_LS_KEY)
    return stored ? (Number(stored) as ZoomLevel) : 100
  })
  const [sampleType, setSampleType] = useState<SampleInvoiceType>("invoice")
  const [swishQrDataUrl, setSwishQrDataUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Persist zoom preference
  useEffect(() => {
    localStorage.setItem(ZOOM_LS_KEY, String(zoom))
  }, [zoom])

  // Generate Swish QR client-side when Swish fields change
  useEffect(() => {
    if (!form.showSwishQr || !form.swishNumber) {
      setSwishQrDataUrl(null)
      return
    }
    const payload = `C${form.swishNumber.replace(/\s/g, "")};290.00;FV-2026-0001;0`
    QRCode.toDataURL(payload, { width: 120, margin: 1 })
      .then(setSwishQrDataUrl)
      .catch(() => setSwishQrDataUrl(null))
  }, [form.showSwishQr, form.swishNumber])

  const template = useMemo(() => formToTemplateData(form), [form])
  const lang = form.language === "en" ? "en" : "sv"

  const previewData: InvoicePdfData = useMemo(
    () => buildSampleInvoice(sampleType, template, swishQrDataUrl, lang),
    [sampleType, template, swishQrDataUrl, lang]
  )

  async function handleDownload() {
    setDownloading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React.createElement(InvoicePdf, { d: previewData }) as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "faktura-preview.pdf"
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  // A4 aspect ratio: 297/210 ≈ 1.414. At 100% zoom, use a generous viewer height.
  const scale = zoom / 100
  // Container height at 100% = 900px. Viewer content height is always 900px,
  // but we scale the outer div so the pdf appears at the correct zoom.
  const viewerH = 900

  return (
    <div className="flex flex-col gap-3 h-full">
      <TemplatePreviewControls
        zoom={zoom}
        onZoomChange={setZoom}
        sampleType={sampleType}
        onTypeChange={setSampleType}
        onDownload={handleDownload}
        downloading={downloading}
      />

      {/* Viewer container */}
      <div
        ref={containerRef}
        className="flex-1 bg-muted/20 border border-border rounded-lg overflow-auto"
        style={{ minHeight: 400 }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${100 / scale}%`,
            height: `${viewerH}px`,
          }}
        >
          <PdfViewerClient data={previewData} />
        </div>
      </div>
    </div>
  )
}
