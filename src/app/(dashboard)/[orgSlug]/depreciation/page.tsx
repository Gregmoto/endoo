"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type PreviewLine = {
  assetId:            string
  assetName:          string
  assetNumber:        string
  period:             string
  depreciationAmount: string
  accumulatedAmount:  string
  bookValue:          string
  alreadyPosted:      boolean
}

type PostResult = {
  period:     string
  posted:     number
  skipped:    number
  journalIds: string[]
}

function fmtAmount(öre: string) {
  return (Number(öre) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr"
}

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export default function DepreciationPage() {
  useParams<{ orgSlug: string }>()

  const [period, setPeriod]       = useState(currentPeriod())
  const [preview, setPreview]     = useState<PreviewLine[] | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [posting, setPosting]     = useState(false)
  const [result, setResult]       = useState<PostResult | null>(null)
  const [postError, setPostError] = useState<string | null>(null)

  async function handlePreview() {
    setPreviewing(true)
    setPreviewError(null)
    setPreview(null)
    setResult(null)
    const res = await fetch(`/api/depreciation/preview?period=${period}`)
    if (res.ok) {
      setPreview(await res.json())
    } else {
      const data = await res.json().catch(() => ({}))
      setPreviewError(data.error ?? "Förhandsgranskning misslyckades")
    }
    setPreviewing(false)
  }

  async function handlePost() {
    if (!confirm(`Bokför avskrivningar för ${period}? Åtgärden skapar verifikationer och kan inte ångras.`)) return
    setPosting(true)
    setPostError(null)
    const res = await fetch("/api/depreciation/post", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ period }),
    })
    if (res.ok) {
      setResult(await res.json())
      setPreview(null)
    } else {
      const data = await res.json().catch(() => ({}))
      setPostError(data.error ?? "Bokföring misslyckades")
    }
    setPosting(false)
  }

  const totalToPost = preview?.filter(l => !l.alreadyPosted) ?? []
  const totalAmount = totalToPost.reduce((s, l) => s + Number(l.depreciationAmount), 0)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Avskrivningar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bokför månatliga avskrivningar för alla aktiva anläggningstillgångar.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Välj period</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="period">Period (YYYY-MM)</label>
              <Input
                id="period"
                value={period}
                onChange={e => { setPeriod(e.target.value); setPreview(null); setResult(null) }}
                pattern="\d{4}-\d{2}"
                placeholder="2026-05"
                className="w-36"
              />
            </div>
            <Button onClick={handlePreview} disabled={previewing} variant="outline">
              {previewing ? "Förhandsgranskar..." : "Förhandsgranska"}
            </Button>
          </div>
          {previewError && <p className="text-sm text-destructive">{previewError}</p>}
        </CardContent>
      </Card>

      {preview !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Förhandsgranskning — {period}</CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {totalToPost.length} tillgångar · {fmtAmount(String(totalAmount))} totalt
                </span>
                {totalToPost.length > 0 && (
                  <Button onClick={handlePost} disabled={posting}>
                    {posting ? "Bokför..." : `Bokför ${period}`}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {preview.length === 0 ? (
              <p className="p-4 text-muted-foreground text-sm">Inga tillgångar att skriva av denna period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="px-4 py-2 font-medium">Nummer</th>
                    <th className="px-4 py-2 font-medium">Tillgång</th>
                    <th className="px-4 py-2 font-medium text-right">Avskrivning</th>
                    <th className="px-4 py-2 font-medium text-right">Bokfört värde efter</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(l => (
                    <tr key={l.assetId} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{l.assetNumber}</td>
                      <td className="px-4 py-2 text-foreground">{l.assetName}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmtAmount(l.depreciationAmount)}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmtAmount(l.bookValue)}</td>
                      <td className="px-4 py-2">
                        {l.alreadyPosted
                          ? <span className="text-xs text-muted-foreground">Redan bokförd</span>
                          : <span className="text-xs text-green-700">Att bokföra</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
          {postError && <p className="p-4 text-sm text-destructive">{postError}</p>}
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="p-4">
            <p className="font-medium text-foreground">
              ✓ Avskrivningar bokförda för {result.period}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {result.posted} verifikationer skapade · {result.skipped} hoppades över
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
