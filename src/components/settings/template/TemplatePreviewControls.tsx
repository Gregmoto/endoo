"use client"

import type { SampleInvoiceType } from "@/lib/pdf/sample-data"

const ZOOM_OPTIONS = [50, 75, 100, 125, 150] as const
export type ZoomLevel = typeof ZOOM_OPTIONS[number]

const SAMPLE_TYPES: Array<{ value: SampleInvoiceType; label: string }> = [
  { value: "invoice",          label: "Faktura" },
  { value: "credit_note",      label: "Kreditnota" },
  { value: "proforma",         label: "Proformafaktura" },
  { value: "interest_invoice", label: "Räntefaktura" },
  { value: "reminder",         label: "Påminnelse" },
]

interface Props {
  zoom:          ZoomLevel
  onZoomChange:  (z: ZoomLevel) => void
  sampleType:    SampleInvoiceType
  onTypeChange:  (t: SampleInvoiceType) => void
  onDownload:    () => void
  downloading:   boolean
}

export function TemplatePreviewControls({
  zoom, onZoomChange, sampleType, onTypeChange, onDownload, downloading,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Zoom */}
      <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => {
            const idx = ZOOM_OPTIONS.indexOf(zoom)
            if (idx > 0) onZoomChange(ZOOM_OPTIONS[idx - 1])
          }}
          disabled={zoom === 50}
          className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zooma ut"
        >
          −
        </button>
        <select
          value={zoom}
          onChange={e => onZoomChange(Number(e.target.value) as ZoomLevel)}
          className="py-1.5 px-1 bg-transparent text-foreground text-xs focus:outline-none cursor-pointer border-x border-border"
        >
          {ZOOM_OPTIONS.map(z => (
            <option key={z} value={z}>{z}%</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const idx = ZOOM_OPTIONS.indexOf(zoom)
            if (idx < ZOOM_OPTIONS.length - 1) onZoomChange(ZOOM_OPTIONS[idx + 1])
          }}
          disabled={zoom === 150}
          className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zooma in"
        >
          +
        </button>
      </div>

      {/* Sample type */}
      <select
        value={sampleType}
        onChange={e => onTypeChange(e.target.value as SampleInvoiceType)}
        className="text-xs px-2 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        title="Förhandsvisa som"
      >
        {SAMPLE_TYPES.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {/* Download */}
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className="text-xs px-3 py-1.5 border border-border rounded-lg text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
      >
        <span>{downloading ? "Genererar…" : "⤓ Ladda ner PDF"}</span>
      </button>
    </div>
  )
}
