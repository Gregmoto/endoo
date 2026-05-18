"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter }             from "next/navigation"
import Link                                 from "next/link"

type StockItem = {
  itemId:        string
  productName:   string
  sku:           string | null
  unitOfMeasure: string
  quantity:      string
  totalValue:    string
  avgCost:       string
  reorderPoint:  string | null
  belowReorder:  boolean
}

function fmt(ore: string) {
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(Number(ore) / 100) + " kr"
}

function fmtQty(q: string, unit: string) {
  return `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(Number(q))} ${unit}`
}

export default function InventoryPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router      = useRouter()
  const [items,   setItems]   = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/inventory")
    if (res.ok) {
      const d = await res.json()
      setItems(d.items)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(i =>
    i.productName.toLowerCase().includes(search.toLowerCase()) ||
    (i.sku ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = items.reduce((s, i) => s + Number(i.totalValue), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} artiklar · Lagervärde{" "}
            {new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(totalValue / 100)} kr
          </p>
        </div>
        <Link
          href={`/${orgSlug}/inventory/new`}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Lägg till artikel
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Sök artikel eller SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      <div className="bg-card rounded-xl border border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Laddar…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">
              {items.length === 0
                ? "Inga lagerartiklar ännu. Skapa en artikel för att börja spåra lager."
                : "Inga artiklar matchar sökningen."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border">
                {["Artikel", "SKU", "Saldo", "Lagervärde", "Snittk.", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr
                  key={item.itemId}
                  onClick={() => router.push(`/${orgSlug}/inventory/${item.itemId}`)}
                  className="border-t border-border/50 hover:bg-muted cursor-pointer"
                >
                  <td className="px-5 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {item.productName}
                      {item.belowReorder && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                          Lågt lager
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{item.sku ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums">
                    <span className={Number(item.quantity) < 0 ? "text-red-600 font-medium" : "text-gray-900"}>
                      {fmtQty(item.quantity, item.unitOfMeasure)}
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-foreground">{fmt(item.totalValue)}</td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{fmt(item.avgCost)}/{item.unitOfMeasure}</td>
                  <td className="px-5 py-3 text-right text-xs text-indigo-600">Öppna →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
