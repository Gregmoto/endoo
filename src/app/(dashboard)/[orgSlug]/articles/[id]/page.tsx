"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/StatusBadge"

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryItem = {
  id:            string
  unitOfMeasure: string
  costMethod:    string
  reorderPoint:  number | null
}

type PriceListEntry = {
  id:        string
  price:     number
  priceList: { id: string; name: string; currency: string }
}

type ManualReservation = {
  id:          string
  quantity:    number
  reason:      string
  notes:       string | null
  reservedAt:  string
  expiresAt:   string | null
  cancelledAt: string | null
}

type InventoryTransaction = {
  id:           string
  type:         string
  quantity:     number
  unitCost:     number
  memo:         string | null
  transactedAt: string
  createdAt:    string
}

type AuditEntry = {
  id:         string
  action:     string
  createdAt:  string
  after:      Record<string, unknown> | null
}

type Article = {
  id:                    string
  sku:                   string | null
  ean:                   string | null
  name:                  string
  description:           string | null
  type:                  "product" | "service"
  isActive:              boolean
  isStockItem:           boolean
  isPhasingOut:          boolean
  unitPrice:             number
  currency:              string
  purchasePrice:         number | null
  averageCost:           number
  stockQuantity:         number
  reservedQuantity:      number
  availableQuantity:     number
  inventoryValue:        number
  vatType:               string | null
  salesAccount:          string | null
  purchaseAccount:       string | null
  salesAccountReverseSE: string | null
  salesAccountReverseEU: string | null
  salesAccountVatableEU: string | null
  salesAccountExport:    string | null
  inventoryAccount:      string | null
  inventoryChangeAccount:string | null
  manufacturer:          string | null
  manufacturerSku:       string | null
  notes:                 string | null
  warehouseLocation:     string | null
  width:                 number | null
  height:                number | null
  depth:                 number | null
  weightGrams:           number | null
  lastStockUpdateAt:     string | null
  createdAt:             string
  updatedAt:             string
  inventoryItem:         InventoryItem | null
  priceListItems:        PriceListEntry[]
  manualReservations:    ManualReservation[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKr(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtQty(qty: number): string {
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(qty)
}

function fmtDate(d: string | null): string {
  if (!d) return "–"
  return new Date(d).toLocaleDateString("sv-SE")
}

function fmtDateTime(d: string | null): string {
  if (!d) return "–"
  return new Date(d).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
}

function marginPct(salesOre: number, costOre: number): string {
  if (salesOre <= 0 || costOre <= 0) return "–"
  return ((1 - costOre / salesOre) * 100).toFixed(1) + " %"
}

const TX_LABELS: Record<string, string> = {
  purchase:   "Inköp",
  sale:       "Försäljning",
  return_in:  "Retur in",
  return_out: "Retur ut",
  adjustment: "Justering",
  count_set:  "Inventering",
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value ?? "–"}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = "general" | "price" | "accounting" | "stock" | "purchase" | "history"

const TABS: { key: Tab; label: string }[] = [
  { key: "general",    label: "Allmän information" },
  { key: "price",      label: "Pris" },
  { key: "accounting", label: "Bokföring" },
  { key: "stock",      label: "Lagerdetaljer" },
  { key: "purchase",   label: "Inköp" },
  { key: "history",    label: "Historik" },
]

export default function ArticleDetailPage() {
  const params    = useParams<{ orgSlug: string; id: string }>()
  const router    = useRouter()
  const { orgSlug, id } = params

  const [article,   setArticle]   = useState<Article | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [tab,       setTab]       = useState<Tab>("general")
  const [history,   setHistory]   = useState<{ transactions: InventoryTransaction[]; auditLogs: AuditEntry[] } | null>(null)
  const [histLoad,  setHistLoad]  = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/articles/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null }
        if (!r.ok) { setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setArticle(data)
        setLoading(false)
      })
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (tab === "history" && !history) {
      setHistLoad(true)
      fetch(`/api/articles/${id}/history`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setHistory(data); setHistLoad(false) })
    }
  }, [tab, id, history])

  async function toggleActive() {
    if (!article) return
    setActionBusy(true)
    const endpoint = article.isActive
      ? `/api/articles/${id}/archive`
      : `/api/articles/${id}/activate`
    await fetch(endpoint, { method: "POST" })
    await load()
    setActionBusy(false)
  }

  async function deleteArticle() {
    if (!confirm("Är du säker på att du vill ta bort artikeln? Åtgärden kan inte ångras.")) return
    setActionBusy(true)
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" })
    if (res.ok) router.push(`/${orgSlug}/articles`)
    setActionBusy(false)
  }

  if (loading)  return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>
  if (notFound) return <div className="p-8 text-sm text-destructive">Artikeln hittades inte.</div>
  if (!article) return null

  const showStock = article.type === "product" && article.isStockItem

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-card flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/${orgSlug}/articles`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Artiklar
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-base font-semibold text-foreground">{article.name}</h1>
          {article.sku && <span className="text-sm text-muted-foreground">{article.sku}</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={actionBusy}
            onClick={toggleActive}
          >
            {article.isActive ? "Inaktivera" : "Aktivera"}
          </Button>
          <Link href={`/${orgSlug}/articles/${id}/edit`}>
            <Button size="sm">Redigera</Button>
          </Link>
        </div>
      </div>

      {/* Status strip */}
      <div className="px-6 py-3 border-b bg-card flex items-center gap-4 flex-wrap">
        <StatusBadge status={article.isActive ? "active" : "inactive"} />
        {article.isPhasingOut && <StatusBadge status="phasing_out" />}
        <span className="text-sm text-muted-foreground">
          {article.type === "product" ? "Produkt" : "Tjänst"}
          {article.isStockItem && " · Lagervara"}
        </span>
        {article.ean && (
          <span className="text-sm text-muted-foreground font-mono">{article.ean}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b bg-card px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.filter(t => showStock || (t.key !== "stock" && t.key !== "purchase")).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl">

        {tab === "general" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Grunduppgifter</CardTitle></CardHeader>
              <CardContent>
                <Row label="Artikelnamn"    value={article.name} />
                <Row label="Artikelnummer"  value={article.sku} />
                <Row label="EAN"            value={article.ean} />
                <Row label="Typ"            value={article.type === "product" ? "Produkt" : "Tjänst"} />
                <Row label="Lagervara"      value={article.isStockItem ? "Ja" : "Nej"} />
                <Row label="Status"         value={<StatusBadge status={article.isActive ? "active" : "inactive"} />} />
                <Row label="Utgående"       value={article.isPhasingOut ? "Ja" : "Nej"} />
              </CardContent>
            </Card>
            {article.description && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Beskrivning</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{article.description}</p>
                </CardContent>
              </Card>
            )}
            {(article.manufacturer || article.manufacturerSku) && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Tillverkarinfo</CardTitle></CardHeader>
                <CardContent>
                  <Row label="Tillverkare"      value={article.manufacturer} />
                  <Row label="Tillverkarens nr" value={article.manufacturerSku} />
                </CardContent>
              </Card>
            )}
            {article.notes && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Anteckningar</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{article.notes}</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-sm">Metadata</CardTitle></CardHeader>
              <CardContent>
                <Row label="Skapad"    value={fmtDateTime(article.createdAt)} />
                <Row label="Uppdaterad" value={fmtDateTime(article.updatedAt)} />
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "price" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Prissättning</CardTitle></CardHeader>
              <CardContent>
                <Row label="Försäljningspris" value={`${fmtKr(article.unitPrice)} ${article.currency}`} />
                <Row label="Momstyp"          value={article.vatType} />
                <Row label="Inköpspris"       value={article.purchasePrice != null ? `${fmtKr(article.purchasePrice)} ${article.currency}` : "–"} />
                {showStock && (
                  <>
                    <Row label="Genomsnittskostnad" value={`${fmtKr(article.averageCost)} ${article.currency}`} />
                    <Row label="Täckningsbidrag (TG%)" value={marginPct(article.unitPrice, article.averageCost)} />
                  </>
                )}
              </CardContent>
            </Card>

            {article.priceListItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Prislistor</CardTitle></CardHeader>
                <CardContent>
                  {article.priceListItems.map(p => (
                    <Row
                      key={p.id}
                      label={p.priceList.name}
                      value={`${fmtKr(p.price)} ${p.priceList.currency}`}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Link href={`/${orgSlug}/articles/${id}/edit?tab=price`}>
                <Button variant="outline" size="sm">Redigera pris</Button>
              </Link>
            </div>
          </div>
        )}

        {tab === "accounting" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Försäljningskonton</CardTitle></CardHeader>
              <CardContent>
                <Row label="Standardkonto"         value={article.salesAccount} />
                <Row label="Omvänd moms SE"        value={article.salesAccountReverseSE} />
                <Row label="Omvänd moms EU (varor)" value={article.salesAccountReverseEU} />
                <Row label="Moms EU (varor)"       value={article.salesAccountVatableEU} />
                <Row label="Export"                value={article.salesAccountExport} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Inköps- och lagerkonton</CardTitle></CardHeader>
              <CardContent>
                <Row label="Inköpskonto"           value={article.purchaseAccount} />
                <Row label="Lagerkonto"            value={article.inventoryAccount} />
                <Row label="Lagerförändringskonto" value={article.inventoryChangeAccount} />
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "stock" && showStock && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Lagerstatus</CardTitle></CardHeader>
              <CardContent>
                <Row label="I lager"         value={fmtQty(article.stockQuantity)} />
                <Row label="Reserverat"      value={fmtQty(article.reservedQuantity)} />
                <Row label="Tillgängligt"    value={fmtQty(article.availableQuantity)} />
                <Row label="Lagervärde"      value={`${fmtKr(article.inventoryValue)} ${article.currency}`} />
                <Row label="Senast uppdaterat" value={fmtDateTime(article.lastStockUpdateAt)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Fysisk info</CardTitle></CardHeader>
              <CardContent>
                <Row label="Lagerplats"  value={article.warehouseLocation} />
                <Row label="Bredd (mm)"  value={article.width} />
                <Row label="Höjd (mm)"   value={article.height} />
                <Row label="Djup (mm)"   value={article.depth} />
                <Row label="Vikt (g)"    value={article.weightGrams} />
              </CardContent>
            </Card>
            {article.manualReservations.filter(r => !r.cancelledAt).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Manuella reserveringar</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {article.manualReservations.filter(r => !r.cancelledAt).map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
                        <div>
                          <span className="font-medium">{fmtQty(r.quantity)} st</span>
                          <span className="text-muted-foreground ml-2">— {r.reason}</span>
                          {r.expiresAt && (
                            <span className="text-muted-foreground ml-2">
                              (upphör {fmtDate(r.expiresAt)})
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">{fmtDate(r.reservedAt)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "purchase" && showStock && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Inköpsinformation</CardTitle></CardHeader>
              <CardContent>
                <Row label="Inköpspris"           value={article.purchasePrice != null ? `${fmtKr(article.purchasePrice)} ${article.currency}` : "–"} />
                <Row label="Genomsnittskostnad"   value={`${fmtKr(article.averageCost)} ${article.currency}`} />
                <Row label="Inköpskonto"          value={article.purchaseAccount} />
                <Row label="Tillverkare"          value={article.manufacturer} />
                <Row label="Tillverkarens art.nr" value={article.manufacturerSku} />
              </CardContent>
            </Card>
            {article.inventoryItem && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Lagerenhet</CardTitle></CardHeader>
                <CardContent>
                  <Row label="Enhet"            value={article.inventoryItem.unitOfMeasure} />
                  <Row label="Kostnadsmetod"    value={article.inventoryItem.costMethod === "average" ? "Rörligt genomsnitt" : "Standardkostnad"} />
                  <Row label="Beställningspunkt" value={article.inventoryItem.reorderPoint != null ? fmtQty(article.inventoryItem.reorderPoint) : "–"} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-6">
            {histLoad && <div className="text-sm text-muted-foreground">Laddar historik…</div>}
            {history && (
              <>
                {history.transactions.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Lagertransaktioner</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-2 pr-4 font-medium">Datum</th>
                              <th className="text-left py-2 pr-4 font-medium">Typ</th>
                              <th className="text-right py-2 pr-4 font-medium">Antal</th>
                              <th className="text-right py-2 font-medium">á-pris</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.transactions.map(tx => (
                              <tr key={tx.id} className="border-b last:border-b-0">
                                <td className="py-2 pr-4 text-foreground">{fmtDate(tx.transactedAt)}</td>
                                <td className="py-2 pr-4 text-foreground">{TX_LABELS[tx.type] ?? tx.type}</td>
                                <td className={[
                                  "py-2 pr-4 text-right font-mono",
                                  Number(tx.quantity) >= 0 ? "text-primary" : "text-destructive",
                                ].join(" ")}>
                                  {Number(tx.quantity) > 0 ? "+" : ""}{fmtQty(Number(tx.quantity))}
                                </td>
                                <td className="py-2 text-right text-foreground font-mono">
                                  {tx.unitCost ? `${fmtKr(Number(tx.unitCost))} kr` : "–"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {history.transactions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Inga lagertransaktioner registrerade.</p>
                )}

                {history.auditLogs.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Ändringslogg</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {history.auditLogs.map(log => (
                          <div key={log.id} className="flex items-start justify-between text-sm py-2 border-b last:border-b-0 gap-2">
                            <span className="text-foreground capitalize">{log.action}</span>
                            <span className="text-muted-foreground text-right">{fmtDateTime(log.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="px-6 pb-6 max-w-4xl">
        <button
          onClick={deleteArticle}
          disabled={actionBusy}
          className="text-xs text-destructive hover:underline disabled:opacity-50"
        >
          Ta bort artikel
        </button>
      </div>
    </div>
  )
}
