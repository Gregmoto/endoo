"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams }                         from "next/navigation"
import Link                                  from "next/link"

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

type TxRow = {
  id:           string
  type:         string
  quantity:     string
  unitCost:     string
  totalCost:    string
  memo:         string | null
  sourceType:   string | null
  transactedAt: string
  runningQty:   string
}

const TX_LABEL: Record<string, string> = {
  purchase:   "Inköp",
  sale:       "Försäljning",
  return_in:  "Retur in",
  return_out: "Retur ut",
  adjustment: "Justering",
  count_set:  "Inventering",
}

const TX_COLOR: Record<string, string> = {
  purchase:   "bg-green-100 text-green-700",
  sale:       "bg-blue-100 text-blue-700",
  return_in:  "bg-teal-100 text-teal-700",
  return_out: "bg-orange-100 text-orange-700",
  adjustment: "bg-gray-100 text-gray-600",
  count_set:  "bg-purple-100 text-purple-700",
}

function fmt(ore: string) {
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(Number(ore) / 100) + " kr"
}

function fmtQty(q: string, unit: string, showSign = false) {
  const n = Number(q)
  const s = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 4 }).format(Math.abs(n))
  return `${showSign && n > 0 ? "+" : n < 0 ? "−" : ""}${s} ${unit}`
}

export default function InventoryItemPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()

  const [item,    setItem]    = useState<StockItem | null>(null)
  const [txs,     setTxs]     = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)

  // New transaction form
  const [showTxForm,  setShowTxForm]  = useState(false)
  const [showCount,   setShowCount]   = useState(false)
  const [txType,      setTxType]      = useState("purchase")
  const [txQty,       setTxQty]       = useState("")
  const [txCost,      setTxCost]      = useState("")
  const [txMemo,      setTxMemo]      = useState("")
  const [txDate,      setTxDate]      = useState(new Date().toISOString().slice(0, 10))
  const [countQty,    setCountQty]    = useState("")
  const [countMemo,   setCountMemo]   = useState("")
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/inventory/${id}`)
    if (res.ok) {
      const d = await res.json()
      setItem(d.item)
      setTxs(d.transactions)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function submitTransaction() {
    setSaving(true); setError("")
    const qty = txType === "sale" || txType === "return_out" ? -Math.abs(Number(txQty)) : Math.abs(Number(txQty))
    const res = await fetch(`/api/inventory/${id}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: txType, quantity: qty, unitCost: Number(txCost), memo: txMemo || undefined, transactedAt: txDate }),
    })
    if (res.ok) {
      setShowTxForm(false); setTxQty(""); setTxCost(""); setTxMemo("")
      await load()
    } else {
      const d = await res.json()
      setError(d.error ?? "Fel")
    }
    setSaving(false)
  }

  async function submitCount() {
    setSaving(true); setError("")
    const res = await fetch(`/api/inventory/${id}/count`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countedQuantity: Number(countQty), memo: countMemo || undefined, transactedAt: txDate }),
    })
    if (res.ok) {
      setShowCount(false); setCountQty(""); setCountMemo("")
      await load()
    } else {
      const d = await res.json()
      setError(d.error ?? "Fel")
    }
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Laddar…</div>
  if (!item)   return <div className="p-6 text-sm text-red-500">Artikel hittades inte.</div>

  const unit = item.unitOfMeasure

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href={`/${orgSlug}/inventory`} className="text-sm text-gray-500 hover:text-gray-700">
        ← Lager
      </Link>

      {/* Header */}
      <div className="mt-3 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{item.productName}</h1>
          {item.sku && <p className="text-sm text-gray-500 mt-0.5 font-mono">SKU: {item.sku}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCount(true); setShowTxForm(false) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Inventering
          </button>
          <button
            onClick={() => { setShowTxForm(true); setShowCount(false) }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Transaktion
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Lagersaldo", value: fmtQty(item.quantity, unit), alert: item.belowReorder },
          { label: "Lagervärde",  value: fmt(item.totalValue) },
          { label: "Snittkostnad", value: `${fmt(item.avgCost)}/${unit}` },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl border p-4 ${c.alert ? "border-red-200 bg-red-50" : "border-gray-100"}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className={`mt-1 text-xl font-bold ${c.alert ? "text-red-600" : "text-gray-900"}`}>{c.value}</p>
            {c.alert && <p className="text-xs text-red-500 mt-0.5">Under beställningspunkt ({fmtQty(item.reorderPoint!, unit)})</p>}
          </div>
        ))}
      </div>

      {/* Transaction form */}
      {showTxForm && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ny transaktion</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Typ</label>
              <select value={txType} onChange={e => setTxType(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {Object.entries(TX_LABEL).filter(([k]) => k !== "count_set").map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Datum</label>
              <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Antal ({unit})</label>
              <input type="number" min="0" step="0.001" value={txQty} onChange={e => setTxQty(e.target.value)}
                placeholder="0"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Enhetskostnad (kr)</label>
              <input type="number" min="0" step="0.01" value={txCost} onChange={e => setTxCost(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Memo</label>
              <input type="text" value={txMemo} onChange={e => setTxMemo(e.target.value)}
                placeholder="Valfri anteckning"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => setShowTxForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Avbryt</button>
            <button onClick={submitTransaction} disabled={!txQty || saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Sparar…" : "Spara"}
            </button>
          </div>
        </div>
      )}

      {/* Stock count form */}
      {showCount && (
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Inventering</h3>
          <p className="text-xs text-gray-500 mb-4">Aktuellt saldo: {fmtQty(item.quantity, unit)}. Ange räknat antal — systemet beräknar differensen.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Räknat antal ({unit})</label>
              <input type="number" min="0" step="0.001" value={countQty} onChange={e => setCountQty(e.target.value)}
                placeholder="0"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Datum</label>
              <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Memo</label>
              <input type="text" value={countMemo} onChange={e => setCountMemo(e.target.value)}
                placeholder={`Inventering ${txDate}`}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => setShowCount(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Avbryt</button>
            <button onClick={submitCount} disabled={countQty === "" || saving}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {saving ? "Sparar…" : "Genomför inventering"}
            </button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Transaktionshistorik</h2>
        </div>
        {txs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Inga transaktioner ännu</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Datum", "Typ", "Antal", "Enhetsk.", "Totalt", "Saldo", "Memo"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...txs].reverse().map(tx => (
                <tr key={tx.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600">{new Date(tx.transactedAt).toLocaleDateString("sv-SE")}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TX_COLOR[tx.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {TX_LABEL[tx.type] ?? tx.type}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 tabular-nums font-medium ${Number(tx.quantity) < 0 ? "text-red-600" : "text-green-700"}`}>
                    {fmtQty(tx.quantity, unit, true)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-600">{fmt(tx.unitCost)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-900">{fmt(tx.totalCost)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700 font-medium">{fmtQty(tx.runningQty, unit)}</td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{tx.memo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
