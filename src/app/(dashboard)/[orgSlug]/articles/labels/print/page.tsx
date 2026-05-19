"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type Article = {
  id:    string
  sku:   string | null
  name:  string
  ean:   string | null
  unitPrice: number
  currency:  string
}

const AVERY_FORMATS = [
  { id: "3474", label: "Avery 3474 (70×37 mm, 3×8)", cols: 3, rows: 8, w: 70, h: 37 },
  { id: "3481", label: "Avery 3481 (38×21 mm, 5×13)", cols: 5, rows: 13, w: 38, h: 21 },
  { id: "custom", label: "Anpassad", cols: 3, rows: 10, w: 60, h: 30 },
]

export default function LabelPrintPage() {
  const params       = useParams<{ orgSlug: string }>()
  const searchParams = useSearchParams()
  const ids          = (searchParams.get("ids") ?? "").split(",").filter(Boolean)

  const [articles,  setArticles]  = useState<Article[]>([])
  const [format,    setFormat]    = useState(AVERY_FORMATS[0])
  const [barcodeType, setBarcodeType] = useState<"code128" | "ean13">("code128")
  const [copies,    setCopies]    = useState(1)
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    const results = await Promise.all(
      ids.map(id =>
        fetch(`/api/articles/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then((d: Article | null) => d)
      )
    )
    setArticles(results.filter(Boolean) as Article[])
    setLoading(false)
  }, [ids.join(",")])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const labelsToRender = articles.flatMap(a => Array(copies).fill(a) as Article[])
  const fmtPrice = (ore: number, cur: string) =>
    `${(ore / 100).toFixed(2)} ${cur}`

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>

  if (ids.length === 0) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground mb-4">
          Ingen artikel vald. Gå tillbaka till artikellistan och välj artiklar att skriva ut etiketter för.
        </p>
        <Link href={`/${params.orgSlug}/articles`}>
          <Button variant="outline" size="sm">← Artiklar</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header (hidden in print) */}
      <div className="px-6 py-4 border-b bg-card flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/${params.orgSlug}/articles`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Artiklar
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-base font-semibold text-foreground">Skriv ut etiketter</h1>
        </div>
        <Button onClick={() => window.print()} size="sm">Skriv ut</Button>
      </div>

      {/* Settings (hidden in print) */}
      <div className="px-6 py-4 border-b bg-card print:hidden">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Format</label>
            <select
              className="border border-input rounded px-2 py-1.5 text-sm bg-card text-foreground"
              value={format.id}
              onChange={e => setFormat(AVERY_FORMATS.find(f => f.id === e.target.value) ?? AVERY_FORMATS[0])}
            >
              {AVERY_FORMATS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Streckkod</label>
            <select
              className="border border-input rounded px-2 py-1.5 text-sm bg-card text-foreground"
              value={barcodeType}
              onChange={e => setBarcodeType(e.target.value as "code128" | "ean13")}
            >
              <option value="code128">Code 128 (SKU)</option>
              <option value="ean13">EAN-13 (om tillgänglig)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Kopior per artikel</label>
            <input
              type="number"
              min={1}
              max={100}
              value={copies}
              onChange={e => setCopies(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="border border-input rounded px-2 py-1.5 text-sm bg-card text-foreground w-20"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {labelsToRender.length} etiketter totalt · {articles.length} unika artiklar
        </p>
      </div>

      {/* Label grid */}
      <div className="p-6 print:p-0">
        <div
          className="grid gap-1 print:gap-0"
          style={{ gridTemplateColumns: `repeat(${format.cols}, 1fr)` }}
        >
          {labelsToRender.map((a, i) => {
            const code = barcodeType === "ean13" && a.ean ? a.ean : a.sku ?? a.id
            const imgSrc = `/api/articles/${a.id}/label?format=${barcodeType}`
            return (
              <div
                key={`${a.id}-${i}`}
                style={{ width: `${format.w}mm`, height: `${format.h}mm`, minWidth: "80px" }}
                className="border rounded-sm print:border-dotted overflow-hidden bg-card"
              >
                <div className="p-1 flex flex-col items-center justify-between h-full">
                  <p className="text-[8px] font-semibold text-foreground leading-tight text-center line-clamp-2 w-full">
                    {a.name}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={code}
                    className="max-h-8 object-contain"
                    loading="lazy"
                  />
                  <div className="text-center">
                    <p className="text-[7px] text-muted-foreground font-mono">{a.sku}</p>
                    <p className="text-[8px] font-bold text-foreground">{fmtPrice(a.unitPrice, a.currency)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
