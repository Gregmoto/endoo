"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Asset = {
  id:                 string
  assetNumber:        string
  name:               string
  category:           string
  acquisitionDate:    string
  acquisitionCost:    string
  bookValue:          string
  depreciationMethod: string
  usefulLifeMonths:   number
  status:             string
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:      { label: "Aktiv",        cls: "bg-green-100 text-green-700" },
  disposed:    { label: "Utrangerad",   cls: "bg-muted text-muted-foreground" },
  written_off: { label: "Avskriven",    cls: "bg-muted text-muted-foreground" },
}

const METHOD_LABELS: Record<string, string> = {
  linear:            "Linjär",
  declining_balance: "Degressiv",
  tax_book:          "Räkenskapsenlig",
}

function fmtAmount(öre: string) {
  return (Number(öre) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr"
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE")
}

export default function FixedAssetsPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [assets, setAssets]   = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fixed-assets")
      .then(r => r.json())
      .then(data => { setAssets(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalAcquisition = assets.reduce((s, a) => s + Number(a.acquisitionCost), 0)
  const totalBookValue   = assets.reduce((s, a) => s + Number(a.bookValue), 0)
  const activeCount      = assets.filter(a => a.status === "active").length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Anläggningstillgångar</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeCount} aktiva tillgångar</p>
        </div>
        <Button onClick={() => router.push(`/${orgSlug}/fixed-assets/new`)}>+ Ny tillgång</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Totalt anskaffningsvärde</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{fmtAmount(String(totalAcquisition))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Totalt bokfört värde</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{fmtAmount(String(totalBookValue))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Aktiva tillgångar</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-muted-foreground">Laddar...</p>
          ) : assets.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <p className="text-lg font-medium">Inga anläggningstillgångar</p>
              <p className="text-sm mt-1">Skapa en ny tillgång för att börja bokföra avskrivningar.</p>
              <Button className="mt-4" onClick={() => router.push(`/${orgSlug}/fixed-assets/new`)}>+ Ny tillgång</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Nummer</th>
                  <th className="px-4 py-3 font-medium">Namn</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Anskaffning</th>
                  <th className="px-4 py-3 font-medium text-right">Anskaffningsvärde</th>
                  <th className="px-4 py-3 font-medium text-right">Bokfört värde</th>
                  <th className="px-4 py-3 font-medium">Metod</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => {
                  const st = STATUS_LABELS[a.status] ?? { label: a.status, cls: "bg-muted text-muted-foreground" }
                  return (
                    <tr
                      key={a.id}
                      className="border-b hover:bg-muted/40 cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/fixed-assets/${a.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{a.assetNumber}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(a.acquisitionDate)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtAmount(a.acquisitionCost)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtAmount(a.bookValue)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{METHOD_LABELS[a.depreciationMethod] ?? a.depreciationMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
