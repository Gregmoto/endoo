"use client"

import { useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type Charset = "CP437" | "UTF-8" | "Latin-1"

type AccountDiff = {
  number:  string
  name:    string
  action:  "create" | "exists" | "name_mismatch"
  ourName: string | null
}

type JournalPreview = {
  series:      string
  number:      string
  date:        string
  description: string
  entryCount:  number
  action:      "import" | "skip_duplicate" | "skip_closed_year" | "skip_unresolved_account" | "skip_balance_error"
}

type Preview = {
  sieType:       number | null
  companyName:   string | null
  orgNr:         string | null
  fiscalYears:   { index: number; start: string; end: string }[]
  accountDiffs:  AccountDiff[]
  journals:      JournalPreview[]
  totalJournals: number
  willImport:    number
  parseErrors:   string[]
  parseWarnings: string[]
}

type ImportResult = {
  accountsCreated:  number
  journalsImported: number
  journalsSkipped:  number
  errors:           string[]
  warnings:         string[]
}

// ─── Step indicators ─────────────────────────────────────────────────────────

const STEPS = [
  "Ladda upp",
  "Granska parsing",
  "Kontomappning",
  "Bekräfta",
  "Resultat",
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const done    = i < current
        const active  = i === current
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={[
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
              done   ? "bg-primary text-primary-foreground"  :
              active ? "bg-primary/20 text-primary border border-primary" :
                       "bg-muted text-muted-foreground",
            ].join(" ")}>
              {done ? "✓" : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px w-8 ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Journal action labels ────────────────────────────────────────────────────

const ACTION_LABEL: Record<JournalPreview["action"], { label: string; cls: string }> = {
  import:                    { label: "Importeras",           cls: "text-green-700" },
  skip_duplicate:            { label: "Hoppar över (duplikat)", cls: "text-muted-foreground" },
  skip_closed_year:          { label: "Hoppar över (stängt år)", cls: "text-muted-foreground" },
  skip_unresolved_account:   { label: "Hoppar över (konto saknas)", cls: "text-destructive" },
  skip_balance_error:        { label: "Hoppar över (obalans)",  cls: "text-destructive" },
}

const ACCOUNT_ACTION_LABEL: Record<AccountDiff["action"], { label: string; cls: string }> = {
  create:        { label: "Skapas",       cls: "text-blue-700" },
  exists:        { label: "Finns redan",  cls: "text-muted-foreground" },
  name_mismatch: { label: "Namnkonflikt", cls: "text-orange-600" },
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SieImportPage() {
  const params  = useParams<{ orgSlug: string }>()
  const { orgSlug } = params

  const [step,         setStep]         = useState(0)
  const [charset,      setCharset]      = useState<Charset>("CP437")
  const [file,         setFile]         = useState<File | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const [importJobId,  setImportJobId]  = useState<string | null>(null)
  const [preview,      setPreview]      = useState<Preview | null>(null)

  // Step 3: account mapping overrides
  const [accountMappingRaw, setAccountMappingRaw] = useState<Record<string, string>>({})

  // Step 4 options
  const [skipExisting,     setSkipExisting]    = useState(true)
  const [createMissing,    setCreateMissing]   = useState(true)
  const [defaultSeries,    setDefaultSeries]   = useState("A")

  // Step 5: result
  const [executing,    setExecuting]    = useState(false)
  const [execError,    setExecError]    = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: upload ──────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("charset", charset)

      const res  = await fetch("/api/accounting/sie/import", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error ?? "Uppladdning misslyckades")
        return
      }
      setImportJobId(data.importJobId)
      setPreview(data.preview)
      setStep(1)
    } catch {
      setUploadError("Nätverksfel — försök igen")
    } finally {
      setUploading(false)
    }
  }, [file, charset])

  // ── Step 3: re-preview with account mapping ─────────────────────────────────

  const handleRepreview = useCallback(async () => {
    if (!importJobId) return
    setUploading(true)
    try {
      const res  = await fetch(`/api/accounting/sie/import/${importJobId}/preview`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          accountMapping:         accountMappingRaw,
          defaultJournalSeries:   defaultSeries,
          skipExistingVerNumbers: skipExisting,
          createMissingAccounts:  createMissing,
        }),
      })
      const data = await res.json()
      if (res.ok) setPreview(data.preview)
    } finally {
      setUploading(false)
    }
  }, [importJobId, accountMappingRaw, defaultSeries, skipExisting, createMissing])

  // ── Step 5: execute ─────────────────────────────────────────────────────────

  const handleExecute = useCallback(async () => {
    if (!importJobId) return
    setExecuting(true)
    setExecError(null)
    try {
      const res  = await fetch(`/api/accounting/sie/import/${importJobId}/execute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          accountMapping:         accountMappingRaw,
          defaultJournalSeries:   defaultSeries,
          skipExistingVerNumbers: skipExisting,
          createMissingAccounts:  createMissing,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.alreadyCompleted) {
          setImportResult(data.result)
          setStep(4)
          return
        }
        setExecError(data.error ?? "Import misslyckades")
        return
      }
      setImportResult(data.result)
      setStep(4)
    } catch {
      setExecError("Nätverksfel — försök igen")
    } finally {
      setExecuting(false)
    }
  }, [importJobId, accountMappingRaw, defaultSeries, skipExisting, createMissing])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Importera SIE-fil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importera SIE 4i (transaktioner) eller 4e (helt år) från Fortnox, Visma eller annat system.
        </p>
      </div>

      <StepBar current={step} />

      {/* ── Step 0: Upload ───────────────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Välj fil</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                SIE-fil (.si, .se, .sie)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".si,.se,.sie,.txt"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-input file:text-sm file:bg-accent file:text-foreground hover:file:bg-muted cursor-pointer"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">
                  {file.name} — {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Teckenkodning</label>
              <select
                value={charset}
                onChange={e => setCharset(e.target.value as Charset)}
                className="w-48 rounded-lg border border-input bg-card text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="CP437">CP437 (standard SIE)</option>
                <option value="UTF-8">UTF-8</option>
                <option value="Latin-1">Latin-1 / ISO-8859-1</option>
              </select>
            </div>

            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Laddar upp..." : "Ladda upp och analysera"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Review parsing result ────────────────────────────────── */}
      {step === 1 && preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Parsningsresultat</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="SIE-typ"       value={preview.sieType ? `Typ ${preview.sieType}` : "Okänd"} />
              <Row label="Företag"       value={preview.companyName ?? "—"} />
              <Row label="Org.nummer"    value={preview.orgNr ?? "—"} />
              <Row label="Räkenskapsår"  value={
                preview.fiscalYears.length
                  ? preview.fiscalYears.map(f => `${f.start.slice(0,4)}: ${f.start}–${f.end}`).join(", ")
                  : "—"
              } />
              <Row label="Konton i fil"  value={String(preview.accountDiffs.length)} />
              <Row label="Verifikat"     value={`${preview.totalJournals} totalt, ${preview.willImport} importeras`} />
            </CardContent>
          </Card>

          {preview.parseErrors.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader><CardTitle className="text-base text-destructive">Fel vid parsning</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {preview.parseErrors.map((e, i) => (
                    <li key={i} className="text-sm text-destructive font-mono">{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {preview.parseWarnings.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-muted-foreground">Varningar</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {preview.parseWarnings.slice(0, 20).map((w, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-mono">{w}</li>
                  ))}
                  {preview.parseWarnings.length > 20 && (
                    <li className="text-xs text-muted-foreground">…och {preview.parseWarnings.length - 20} till</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Verifikat (förhandsgranskning)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-2 font-medium">Serie</th>
                    <th className="px-4 py-2 font-medium">Nr</th>
                    <th className="px-4 py-2 font-medium">Datum</th>
                    <th className="px-4 py-2 font-medium">Beskrivning</th>
                    <th className="px-4 py-2 font-medium text-right">Rader</th>
                    <th className="px-4 py-2 font-medium">Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.journals.slice(0, 50).map((j, i) => {
                    const { label, cls } = ACTION_LABEL[j.action]
                    return (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-1.5 font-mono">{j.series}</td>
                        <td className="px-4 py-1.5 font-mono">{j.number}</td>
                        <td className="px-4 py-1.5 font-mono">{j.date}</td>
                        <td className="px-4 py-1.5 text-muted-foreground truncate max-w-xs">{j.description || "—"}</td>
                        <td className="px-4 py-1.5 text-right">{j.entryCount}</td>
                        <td className={`px-4 py-1.5 ${cls}`}>{label}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {preview.journals.length > 50 && (
                <p className="px-4 py-2 text-xs text-muted-foreground">
                  …och {preview.journals.length - 50} till (visas ej)
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep(0); setPreview(null); setImportJobId(null) }}>
              Tillbaka
            </Button>
            <Button onClick={() => setStep(2)}>Nästa: Kontomappning</Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Account mapping ───────────────────────────────────────── */}
      {step === 2 && preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontomappning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Konton som ska skapas eller har namnkonflikter visas nedan.
                Du kan mappa ett SIE-kontonummer till ett annat kontonummer i Endoo.
                Lämna tomt för att använda SIE-filens nummer.
              </p>
              <div className="space-y-2">
                {preview.accountDiffs.filter(a => a.action !== "exists").map(acc => {
                  const { label, cls } = ACCOUNT_ACTION_LABEL[acc.action]
                  return (
                    <div key={acc.number} className="flex items-center gap-3 p-3 rounded-lg border border-input bg-card">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-foreground">{acc.number}</span>
                          <span className={`text-xs ${cls}`}>{label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {acc.name}
                          {acc.ourName && acc.action === "name_mismatch" && (
                            <> → i Endoo: <span className="text-foreground">{acc.ourName}</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">Mappar till:</span>
                        <input
                          type="text"
                          placeholder={acc.number}
                          value={accountMappingRaw[acc.number] ?? ""}
                          onChange={e => setAccountMappingRaw(prev => ({
                            ...prev,
                            [acc.number]: e.target.value || "",
                          }))}
                          className="w-24 rounded border border-input bg-card text-foreground text-sm px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  )
                })}
                {preview.accountDiffs.filter(a => a.action !== "exists").length === 0 && (
                  <p className="text-sm text-muted-foreground">Inga kontokonflikter — alla konton matchar befintlig kontoplan.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Tillbaka</Button>
            <Button onClick={async () => { await handleRepreview(); setStep(3) }} disabled={uploading}>
              {uploading ? "Uppdaterar..." : "Nästa: Bekräfta"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm options ───────────────────────────────────────── */}
      {step === 3 && preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Importinställningar</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <input
                  id="skipExisting"
                  type="checkbox"
                  checked={skipExisting}
                  onChange={e => setSkipExisting(e.target.checked)}
                  className="rounded border-input"
                />
                <label htmlFor="skipExisting" className="text-foreground cursor-pointer">
                  Hoppa över verifikat med samma serie + nummer (rekommenderat)
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="createMissing"
                  type="checkbox"
                  checked={createMissing}
                  onChange={e => setCreateMissing(e.target.checked)}
                  className="rounded border-input"
                />
                <label htmlFor="createMissing" className="text-foreground cursor-pointer">
                  Skapa saknade konton automatiskt
                </label>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="defaultSeries" className="text-muted-foreground w-48">
                  Standardserie (om SIE-filen saknar serie)
                </label>
                <input
                  id="defaultSeries"
                  type="text"
                  value={defaultSeries}
                  onChange={e => setDefaultSeries(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-20 rounded-lg border border-input bg-card text-foreground text-sm px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sammanfattning</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Verifikat att importera" value={`${preview.willImport} av ${preview.totalJournals}`} />
              <Row label="Konton att skapa"
                value={String(preview.accountDiffs.filter(a => a.action === "create").length)} />
              <Row label="Namnkonflikter"
                value={String(preview.accountDiffs.filter(a => a.action === "name_mismatch").length)} />
              {preview.parseErrors.length > 0 && (
                <Row label="Parsningsfel" value={String(preview.parseErrors.length)} />
              )}
            </CardContent>
          </Card>

          {execError && <p className="text-sm text-destructive">{execError}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>Tillbaka</Button>
            <Button onClick={handleExecute} disabled={executing}>
              {executing ? "Importerar..." : `Importera ${preview.willImport} verifikat`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Result ───────────────────────────────────────────────── */}
      {step === 4 && importResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-green-700">
                {importResult.errors.length === 0 ? "Import klar" : "Import klar med fel"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Konton skapade"       value={String(importResult.accountsCreated)} />
              <Row label="Verifikat importerade" value={String(importResult.journalsImported)} />
              <Row label="Verifikat hoppade"     value={String(importResult.journalsSkipped)} />
            </CardContent>
          </Card>

          {importResult.errors.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader><CardTitle className="text-base text-destructive">Fel</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="text-sm text-destructive font-mono">{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {importResult.warnings.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-muted-foreground">Varningar</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {importResult.warnings.slice(0, 20).map((w, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-mono">{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep(0); setFile(null); setPreview(null)
                setImportJobId(null); setImportResult(null)
              }}
            >
              Importera en till
            </Button>
            <a
              href={`/${orgSlug}/accounting/journals`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Visa verifikat
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  )
}
