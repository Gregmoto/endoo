"use client"

import { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5

const ENDOO_FIELDS = [
  { value: "",               label: "— Hoppa över —" },
  { value: "customerNumber", label: "Kundnummer" },
  { value: "name",           label: "Namn *" },
  { value: "email",          label: "E-post" },
  { value: "phone",          label: "Telefon" },
  { value: "orgNumber",      label: "Org.nummer" },
  { value: "vatNumber",      label: "VAT-nummer" },
  { value: "addressLine1",   label: "Adressrad 1" },
  { value: "addressLine2",   label: "Adressrad 2" },
  { value: "postalCode",     label: "Postnummer" },
  { value: "city",           label: "Stad" },
  { value: "country",        label: "Land (ISO)" },
  { value: "website",        label: "Webbplats" },
  { value: "internalNotes",  label: "Interna anteckningar" },
  { value: "ourReference",   label: "Vår referens" },
  { value: "externalReference", label: "Extern referens" },
  { value: "invoiceEmails",  label: "Fakturaadresser" },
]

function autoMatch(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "")
  const map: Record<string, string> = {
    kundnummer: "customerNumber",
    customernumber: "customerNumber",
    namn: "name",
    name: "name",
    epost: "email",
    email: "email",
    telefon: "phone",
    phone: "phone",
    orgnummer: "orgNumber",
    orgnumber: "orgNumber",
    vatnummer: "vatNumber",
    vatnumber: "vatNumber",
    adress: "addressLine1",
    adressrad1: "addressLine1",
    addressline1: "addressLine1",
    adressrad2: "addressLine2",
    addressline2: "addressLine2",
    postnummer: "postalCode",
    postalcode: "postalCode",
    stad: "city",
    city: "city",
    land: "country",
    country: "country",
    webbplats: "website",
    website: "website",
    anteckningar: "internalNotes",
    notes: "internalNotes",
  }
  return map[h] ?? ""
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  return lines.map(line => {
    const cells: string[] = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cells.push(cur); cur = ""
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    return cells
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]           = useState<Step>(1)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows]     = useState<string[][]>([])
  const [mapping, setMapping]     = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [fileError, setFileError] = useState("")

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError("")
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".csv")) {
      setFileError("Endast CSV-filer stöds för tillfället.")
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      if (rows.length < 2) { setFileError("Filen verkar vara tom."); return }
      const headers = rows[0]
      const dataRows = rows.slice(1)
      setCsvHeaders(headers)
      setCsvRows(dataRows)
      const autoMapping: Record<number, string> = {}
      headers.forEach((h, i) => { autoMapping[i] = autoMatch(h) })
      setMapping(autoMapping)
      setStep(2)
    }
    reader.readAsText(file, "UTF-8")
  }

  async function runImport() {
    setImporting(true)
    setProgress(0)
    setStep(4)

    const fieldMap = Object.entries(mapping)
      .filter(([, v]) => v !== "")
      .map(([colIdx, field]) => ({ colIdx: Number(colIdx), field }))

    const rows = csvRows.map(row => {
      const obj: Record<string, string> = {}
      fieldMap.forEach(({ colIdx, field }) => {
        if (row[colIdx] !== undefined) obj[field] = row[colIdx]
      })
      return obj
    })

    const total = rows.length
    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name?.trim()) { skipped++; setProgress(Math.round(((i + 1) / total) * 100)); continue }
      const res = await fetch("/api/contacts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...row, country: row.country || "SE" }),
      })
      if (res.ok) {
        created++
      } else {
        const d = await res.json().catch(() => ({}))
        errors.push(`Rad ${i + 2}: ${d.error ?? "Okänt fel"}`)
        skipped++
      }
      setProgress(Math.round(((i + 1) / total) * 100))
    }

    setResult({ created, skipped, errors })
    setImporting(false)
    setStep(5)
  }

  const selectCls = "block w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"

  const STEP_LABELS = ["Ladda upp fil", "Kolumnmappning", "Förhandsgranska", "Importerar", "Resultat"]

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <a href={`/${params.orgSlug}/customers`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Kunder
        </a>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-foreground">Importera kunder</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step
          const active  = step === s
          const done    = step > s
          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                  done   ? "bg-primary border-primary text-primary-foreground"
                  : active ? "border-primary text-primary"
                  : "border-muted text-muted-foreground"
                }`}>
                  {done ? "✓" : s}
                </div>
                <span className={`mt-1 text-xs whitespace-nowrap ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 mb-4 transition-colors ${done ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-input rounded-xl p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-4xl mb-3">📁</div>
            <p className="text-foreground font-medium">Klicka för att välja CSV-fil</p>
            <p className="text-sm text-muted-foreground mt-1">Endast .csv stöds</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="text/csv,.csv"
            onChange={handleFile}
            className="hidden"
          />
          {fileError && (
            <p className="text-sm text-destructive">{fileError}</p>
          )}
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Tips för CSV-filen:</p>
            <p>• Första raden ska vara kolumnrubriker</p>
            <p>• Kolumnen "Namn" är obligatorisk</p>
            <p>• Använd komma (,) som avgränsare</p>
            <p>• Spara med UTF-8-kodning</p>
          </div>
        </div>
      )}

      {/* Step 2: Column mapping */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Matcha CSV-kolumnerna till Endoo-fält. Kolumner som matchats automatiskt är markerade.
          </p>
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CSV-kolumn</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exempel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Endoo-fält</th>
                </tr>
              </thead>
              <tbody>
                {csvHeaders.map((header, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{header}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{csvRows[0]?.[i] ?? "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping[i] ?? ""}
                        onChange={e => setMapping(m => ({ ...m, [i]: e.target.value }))}
                        className={`${selectCls} ${mapping[i] ? "border-primary/50" : ""}`}
                      >
                        {ENDOO_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>← Tillbaka</Button>
            <Button onClick={() => setStep(3)}>Förhandsgranska →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Visar de 20 första raderna. Totalt {csvRows.length} rader att importera.
          </p>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {Object.entries(mapping)
                    .filter(([, v]) => v !== "")
                    .map(([colIdx, field]) => {
                      const label = ENDOO_FIELDS.find(f => f.value === field)?.label ?? field
                      return (
                        <th key={colIdx} className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {label}
                        </th>
                      )
                    })}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Object.entries(mapping)
                      .filter(([, v]) => v !== "")
                      .map(([colIdx]) => (
                        <td key={colIdx} className="px-3 py-2 text-foreground">{row[Number(colIdx)] ?? ""}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>← Tillbaka</Button>
            <Button onClick={runImport}>Starta import →</Button>
          </div>
        </div>
      )}

      {/* Step 4: Progress */}
      {step === 4 && (
        <div className="space-y-6 py-8 text-center">
          <div className="text-4xl">⏳</div>
          <p className="text-lg font-medium text-foreground">Importerar…</p>
          <div className="max-w-sm mx-auto">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{progress}%</p>
          </div>
          <p className="text-sm text-muted-foreground">Stäng inte fönstret.</p>
        </div>
      )}

      {/* Step 5: Result */}
      {step === 5 && result && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 rounded-xl border bg-card p-6 text-center">
              <div className="text-3xl font-bold text-foreground">{result.created}</div>
              <div className="text-sm text-muted-foreground mt-1">Importerade</div>
            </div>
            <div className="flex-1 rounded-xl border bg-card p-6 text-center">
              <div className="text-3xl font-bold text-foreground">{result.skipped}</div>
              <div className="text-sm text-muted-foreground mt-1">Hoppade över</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive mb-2">Fel vid import:</p>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-destructive">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={() => router.push(`/${params.orgSlug}/customers`)}>
              Gå till kundlistan
            </Button>
            <Button variant="outline" onClick={() => { setStep(1); setCsvHeaders([]); setCsvRows([]); setResult(null) }}>
              Importera fler
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
