"use client"

import { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type Step = 1 | 2 | 3 | 4 | 5

const MAPPABLE_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "sku",              label: "Artikelnummer" },
  { key: "ean",              label: "EAN" },
  { key: "name",             label: "Namn", required: true },
  { key: "description",      label: "Beskrivning" },
  { key: "manufacturer",     label: "Tillverkare" },
  { key: "manufacturerSku",  label: "Tillv.artikelnr" },
  { key: "unitPrice",        label: "Utpris (kr)" },
  { key: "purchasePrice",    label: "Inköpspris (kr)" },
  { key: "type",             label: "Typ (product/service)" },
  { key: "isStockItem",      label: "Lagervara (ja/nej)" },
  { key: "isActive",         label: "Aktiv (ja/nej)" },
  { key: "vatType",          label: "Momstyp" },
  { key: "salesAccount",     label: "Försäljningskonto" },
  { key: "warehouseLocation",label: "Lagerplats" },
]

type ParsedRow = Record<string, string>

type ImportResult = {
  imported: number
  skipped: number
  errors: { row: number; error: string }[]
}

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const separator  = normalized.includes(";") ? ";" : normalized.includes("\t") ? "\t" : ","

  function parseLine(line: string): string[] {
    const cells: string[] = []
    let i = 0
    while (i < line.length) {
      if (line[i] === '"') {
        let cell = ""
        i++
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2 }
          else if (line[i] === '"') { i++; break }
          else { cell += line[i++] }
        }
        cells.push(cell)
        if (line[i] === separator) i++
      } else {
        const end = line.indexOf(separator, i)
        if (end === -1) { cells.push(line.slice(i)); break }
        cells.push(line.slice(i, end))
        i = end + 1
      }
    }
    return cells
  }

  const lines = normalized.split("\n").filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseLine(lines[0]).map(h => h.trim().replace(/^﻿/, ""))
  const rows: ParsedRow[] = lines.slice(1).map(line => {
    const cells = parseLine(line)
    const row: ParsedRow = {}
    headers.forEach((h, i) => { row[h] = (cells[i] ?? "").trim() })
    return row
  })

  return { headers, rows }
}

function parseSwedishNumber(s: string): number {
  return parseFloat(
    s.replace(/[^\d,.\-]/g, "")
     .replace(",", ".")
  )
}

function parsePriceToOre(s: string): number | null {
  const cleaned = s.replace(/kr|SEK/gi, "").trim()
  const val = parseSwedishNumber(cleaned)
  if (isNaN(val)) return null
  return Math.round(val * 100)
}

function parseBool(s: string): boolean {
  return /^(ja|yes|true|1|aktiv)$/i.test(s.trim())
}

export default function ArticlesImportPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [step, setStep]         = useState<Step>(1)
  const [file, setFile]         = useState<File | null>(null)
  const [headers, setHeaders]   = useState<string[]>([])
  const [rows, setRows]         = useState<ParsedRow[]>([])
  const [mapping, setMapping]   = useState<Record<string, string>>({})
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip")
  const [importing, setImporting] = useState(false)
  const [result, setResult]     = useState<ImportResult | null>(null)
  const fileRef                 = useRef<HTMLInputElement>(null)

  function handleFileChange(f: File | null) {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      const autoMap: Record<string, string> = {}
      MAPPABLE_FIELDS.forEach(field => {
        const match = parsed.headers.find(h =>
          h.toLowerCase().replace(/[^a-z]/g, "") === field.key.toLowerCase() ||
          h.toLowerCase().includes(field.label.toLowerCase().split(" ")[0].toLowerCase())
        )
        if (match) autoMap[field.key] = match
      })
      setMapping(autoMap)
    }
    reader.readAsText(f, "utf-8")
  }

  function getMappedRows(): Record<string, string>[] {
    return rows.map(row => {
      const mapped: Record<string, string> = {}
      Object.entries(mapping).forEach(([field, col]) => {
        if (col) mapped[field] = row[col] ?? ""
      })
      return mapped
    }).filter(r => r.name?.trim())
  }

  async function runImport() {
    setImporting(true)
    const mapped = getMappedRows()
    let imported = 0
    let skipped  = 0
    const errors: { row: number; error: string }[] = []

    for (let i = 0; i < mapped.length; i++) {
      const r = mapped[i]
      try {
        const unitPrice    = r.unitPrice    ? parsePriceToOre(r.unitPrice)    : 0
        const purchasePrice = r.purchasePrice ? parsePriceToOre(r.purchasePrice) : null

        const payload: Record<string, unknown> = {
          name:              r.name,
          sku:               r.sku   || undefined,
          ean:               r.ean   || undefined,
          description:       r.description || undefined,
          manufacturer:      r.manufacturer || undefined,
          manufacturerSku:   r.manufacturerSku || undefined,
          unitPrice:         unitPrice ?? 0,
          purchasePrice:     purchasePrice ?? undefined,
          type:              r.type === "service" ? "service" : "product",
          isStockItem:       r.isStockItem ? parseBool(r.isStockItem) : true,
          isActive:          r.isActive   ? parseBool(r.isActive)   : true,
          vatType:           r.vatType || undefined,
          salesAccount:      r.salesAccount || undefined,
          warehouseLocation: r.warehouseLocation || undefined,
        }

        const res = await fetch("/api/articles", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        })

        if (res.status === 409 && duplicateMode === "skip") {
          skipped++
        } else if (res.status === 409 && duplicateMode === "update") {
          const existing = await fetch(`/api/articles?search=${encodeURIComponent(r.sku ?? r.name)}&limit=1`)
          if (existing.ok) {
            const data = await existing.json()
            const article = data.articles?.[0]
            if (article) {
              await fetch(`/api/articles/${article.id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
              })
              imported++
            } else {
              skipped++
            }
          } else {
            skipped++
          }
        } else if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          errors.push({ row: i + 2, error: err.error ?? "Okänt fel" })
        } else {
          imported++
        }
      } catch (e) {
        errors.push({ row: i + 2, error: String(e) })
      }
    }

    setResult({ imported, skipped, errors })
    setStep(5)
    setImporting(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${orgSlug}/articles`} className="text-muted-foreground hover:text-foreground text-sm">← Tillbaka</Link>
        <h1 className="text-2xl font-bold text-foreground">Importera artiklar</h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Steg {step} av 5: {["Ladda upp", "Mappa kolumner", "Förhandsvisning", "Importera", "Resultat"][step - 1]}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Ladda upp fil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">CSV-fil med semikolon, komma eller tabb som separator. UTF-8 eller ISO-8859-1.</p>
            <div
              className="border-2 border-dashed border-input rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0] ?? null) }}
            >
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
              {file ? (
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{rows.length} rader hittade</p>
                </div>
              ) : (
                <div>
                  <p className="text-foreground">Klicka eller dra hit en CSV-fil</p>
                  <p className="text-sm text-muted-foreground mt-1">Stöder: ; , tab</p>
                </div>
              )}
            </div>
            {file && rows.length > 0 && (
              <Button onClick={() => setStep(2)}>Fortsätt →</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map columns */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Mappa kolumner</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Koppla filens kolumner till artikelfält. Obligatoriska fält är markerade med *.</p>
            <div className="space-y-3">
              {MAPPABLE_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <label className="w-44 text-sm text-foreground shrink-0">
                    {field.label}{field.required && " *"}
                  </label>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Välj kolumn —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-foreground">Vid duplicerat artikelnummer:</label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="radio" name="dup" value="skip" checked={duplicateMode === "skip"} onChange={() => setDuplicateMode("skip")} />
                  Hoppa över
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="radio" name="dup" value="update" checked={duplicateMode === "update"} onChange={() => setDuplicateMode("update")} />
                  Uppdatera befintlig
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>← Tillbaka</Button>
              <Button onClick={() => setStep(3)} disabled={!mapping.name}>Förhandsvisning →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Förhandsvisning</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{getMappedRows().length} artiklar redo att importera (rader utan namn filtreras bort).</p>
            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-input rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted-foreground">Artikelnr</th>
                    <th className="px-3 py-2 text-left text-muted-foreground">Namn</th>
                    <th className="px-3 py-2 text-right text-muted-foreground">Utpris</th>
                    <th className="px-3 py-2 text-left text-muted-foreground">Typ</th>
                  </tr>
                </thead>
                <tbody>
                  {getMappedRows().slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-t border-input">
                      <td className="px-3 py-2 text-muted-foreground font-mono">{r.sku || "—"}</td>
                      <td className="px-3 py-2 text-foreground">{r.name}</td>
                      <td className="px-3 py-2 text-right text-foreground">{r.unitPrice || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.type || "product"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {getMappedRows().length > 100 && (
              <p className="text-xs text-muted-foreground">Visar 100 av {getMappedRows().length} rader.</p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>← Tillbaka</Button>
              <Button onClick={() => setStep(4)}>Importera {getMappedRows().length} artiklar →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Importera</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Klicka på knappen för att starta importen av {getMappedRows().length} artiklar.
              Processen kan ta en stund.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} disabled={importing}>← Tillbaka</Button>
              <Button onClick={runImport} loading={importing} disabled={importing}>
                {importing ? "Importerar…" : "Starta import"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Result */}
      {step === 5 && result && (
        <Card>
          <CardHeader><CardTitle>Importresultat</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">{result.imported}</p>
                <p className="text-sm text-muted-foreground mt-1">Importerade</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">{result.skipped}</p>
                <p className="text-sm text-muted-foreground mt-1">Hoppade över</p>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive">{result.errors.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Fel</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Fel:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive">Rad {e.row}: {e.error}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={() => router.push(`/${orgSlug}/articles`)}>
                Visa artikelregister
              </Button>
              <Button variant="outline" onClick={() => { setStep(1); setFile(null); setRows([]); setResult(null) }}>
                Importera fler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
