"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Product = {
  id: string
  name: string
  sku: string | null
  type: "product" | "service"
  category: string | null
  unitPrice: number
  taxRate: number
  unit: string
  currency: string
  isActive: boolean
  description: string | null
}

function fmtPrice(unitPrice: number, currency: string) {
  return `${(unitPrice / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

export default function ProductsPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const orgSlug = params.orgSlug

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [loading, setLoading]   = useState(true)

  const [search, setSearch]     = useState("")
  const [type, setType]         = useState("")
  const [active, setActive]     = useState("")
  const [page, setPage]         = useState(1)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page) })
    if (search) qs.set("search", search)
    if (type)   qs.set("type", type)
    if (active) qs.set("active", active)
    const res = await fetch(`/api/products?${qs}`)
    if (res.ok) {
      const data = await res.json()
      setProducts(data.products)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [page, search, type, active])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { setPage(1) }, [search, type, active])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produkter & tjänster</h1>
          <p className="text-sm text-gray-500 mt-1">{total} artiklar totalt</p>
        </div>
        <Link href={`/${orgSlug}/products/new`}>
          <Button size="sm">+ Ny artikel</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          type="search"
          placeholder="Sök namn, artikelnr, beskrivning…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alla typer</option>
          <option value="product">Produkt</option>
          <option value="service">Tjänst</option>
        </select>
        <select
          value={active}
          onChange={e => setActive(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alla statusar</option>
          <option value="true">Aktiv</option>
          <option value="false">Inaktiv</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">Laddar…</div>
          ) : products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm text-gray-400">Inga artiklar hittades.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Artikel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Artikelnr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Typ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kategori</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Pris (exkl. moms)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Moms</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr
                    key={p.id}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/${orgSlug}/products/${p.id}`)}
                  >
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{p.sku ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {p.type === "product" ? "Produkt" : "Tjänst"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{p.category ?? "—"}</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {fmtPrice(p.unitPrice, p.currency)}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {(Number(p.taxRate) * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        p.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Sida {page} av {pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Föregående
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Nästa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
