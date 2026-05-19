"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import ArticleForm, { type ArticleFormData } from "@/components/articles/ArticleForm"

export default function ArticleEditPage() {
  const params = useParams<{ orgSlug: string; id: string }>()
  const { orgSlug, id } = params

  const [initialData, setInitialData] = useState<Partial<ArticleFormData> | null>(null)
  const [averageCostOre, setAverageCostOre] = useState<number>(0)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setAverageCostOre(Number(data.averageCost ?? 0))
        setInitialData(mapToFormData(data))
        setLoading(false)
      })
  }, [id])

  if (loading)  return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>
  if (notFound) return <div className="p-8 text-sm text-destructive">Artikeln hittades inte.</div>

  return (
    <ArticleForm
      mode="edit"
      orgSlug={orgSlug}
      articleId={id}
      initialData={initialData ?? undefined}
      averageCostOre={averageCostOre}
    />
  )
}

function mapToFormData(a: Record<string, unknown>): Partial<ArticleFormData> {
  return {
    sku:                    String(a.sku                    ?? ""),
    ean:                    String(a.ean                    ?? ""),
    name:                   String(a.name                   ?? ""),
    description:            String(a.description            ?? ""),
    manufacturer:           String(a.manufacturer           ?? ""),
    manufacturerSku:        String(a.manufacturerSku        ?? ""),
    notes:                  String(a.notes                  ?? ""),
    type:                   (a.type as "product" | "service") ?? "product",
    unit:                   "st",
    isActive:               Boolean(a.isActive),
    isStockItem:            Boolean(a.isStockItem),
    isPhasingOut:           Boolean(a.isPhasingOut),
    unitPriceKr:            a.unitPrice != null ? (Number(a.unitPrice) / 100).toFixed(2) : "",
    taxRateStr:             "0.25",
    purchasePriceKr:        a.purchasePrice != null ? (Number(a.purchasePrice) / 100).toFixed(2) : "",
    vatType:                String(a.vatType                ?? "SE25"),
    salesAccount:           String(a.salesAccount           ?? ""),
    purchaseAccount:        String(a.purchaseAccount        ?? ""),
    salesAccountReverseSE:  String(a.salesAccountReverseSE  ?? ""),
    salesAccountReverseEU:  String(a.salesAccountReverseEU  ?? ""),
    salesAccountVatableEU:  String(a.salesAccountVatableEU  ?? ""),
    salesAccountExport:     String(a.salesAccountExport     ?? ""),
    inventoryAccount:       String(a.inventoryAccount       ?? ""),
    inventoryChangeAccount: String(a.inventoryChangeAccount ?? ""),
    width:                  a.width        != null ? String(a.width)        : "",
    height:                 a.height       != null ? String(a.height)       : "",
    depth:                  a.depth        != null ? String(a.depth)        : "",
    weightGrams:            a.weightGrams  != null ? String(a.weightGrams)  : "",
    warehouseLocation:      String(a.warehouseLocation ?? ""),
  }
}
