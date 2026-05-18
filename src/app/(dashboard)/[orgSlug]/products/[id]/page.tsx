"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Product = {
  id: string
  name: string
  type: "product" | "service"
  isActive: boolean
  sku: string | null
  description: string | null
  unitPrice: number
  taxRate: number
  unit: string
  category: string | null
  currency: string
  createdAt: string
  updatedAt: string
}

const cls = "w-full px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"

function fmtPrice(unitPrice: number, currency: string) {
  return `${(unitPrice / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

export default function ProductDetailPage() {
  const params  = useParams<{ orgSlug: string; id: string }>()
  const router  = useRouter()
  const { orgSlug, id } = params

  const [product, setProduct]   = useState<Product | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit form state
  const [form, setForm]     = useState<Partial<Product> & { unitPriceKr: string; taxRatePct: string }>({
    unitPriceKr: "", taxRatePct: "25",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setProduct(data)
        if (data) {
          setForm({
            ...data,
            unitPriceKr: (data.unitPrice / 100).toFixed(2),
            taxRatePct: (Number(data.taxRate) * 100).toFixed(0),
          })
        }
        setLoading(false)
      })
  }, [id])

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    setError("")

    const unitPrice = Math.round(parseFloat(form.unitPriceKr || "0") * 100)
    const taxRate   = parseFloat(form.taxRatePct || "25") / 100

    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:        form.name,
        type:        form.type,
        isActive:    form.isActive,
        sku:         form.sku         || null,
        description: form.description || null,
        unitPrice,
        taxRate,
        unit:        form.unit        || "st",
        category:    form.category    || null,
        currency:    form.currency    || "SEK",
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setProduct(updated)
      setForm({
        ...updated,
        unitPriceKr: (updated.unitPrice / 100).toFixed(2),
        taxRatePct: (Number(updated.taxRate) * 100).toFixed(0),
      })
      setEditing(false)
    } else {
      const d = await res.json()
      setError(d.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm("Är du säker på att du vill ta bort denna artikel?")) return
    setDeleting(true)
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
    if (res.ok) {
      router.push(`/${orgSlug}/products`)
    } else {
      setDeleting(false)
    }
  }

  if (loading)  return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>
  if (!product) return <div className="p-8 text-sm text-red-500">Produkten hittades inte.</div>

  return (
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${orgSlug}/products`} className="hover:text-foreground">Produkter</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">{product.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
              product.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            }`}>
              {product.isActive ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {product.sku && <span className="font-mono mr-3">{product.sku}</span>}
            {product.type === "product" ? "Produkt" : "Tjänst"}
            {product.category && <span className="ml-3 text-muted-foreground">{product.category}</span>}
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Redigera</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              loading={deleting}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Ta bort
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        // View mode
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Pris & moms</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Pris exkl. moms</dt>
                  <dd className="text-foreground font-semibold text-lg mt-0.5">
                    {fmtPrice(product.unitPrice, product.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pris inkl. moms</dt>
                  <dd className="text-foreground mt-0.5">
                    {fmtPrice(
                      Math.round(product.unitPrice * (1 + Number(product.taxRate))),
                      product.currency
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Momssats</dt>
                  <dd className="text-foreground mt-0.5">{(Number(product.taxRate) * 100).toFixed(0)}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Enhet</dt>
                  <dd className="text-foreground mt-0.5">{product.unit}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {product.description && (
            <Card>
              <CardHeader><CardTitle>Beskrivning</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Skapad {new Date(product.createdAt).toLocaleDateString("sv-SE")} · Uppdaterad {new Date(product.updatedAt).toLocaleDateString("sv-SE")}
          </p>
        </div>
      ) : (
        // Edit mode
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Redigera artikel</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Typ">
                  <select value={form.type} onChange={set("type")} className={cls}>
                    <option value="service">Tjänst</option>
                    <option value="product">Produkt</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.isActive ? "true" : "false"}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "true" }))}
                    className={cls}
                  >
                    <option value="true">Aktiv</option>
                    <option value="false">Inaktiv</option>
                  </select>
                </Field>
              </div>
              <Field label="Namn">
                <input value={form.name ?? ""} onChange={set("name")} className={cls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Artikelnummer">
                  <input value={form.sku ?? ""} onChange={set("sku")} className={cls} />
                </Field>
                <Field label="Kategori">
                  <input value={form.category ?? ""} onChange={set("category")} className={cls} />
                </Field>
              </div>
              <Field label="Beskrivning">
                <textarea value={form.description ?? ""} onChange={set("description")} rows={3} className={`${cls} resize-none`} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pris & moms</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Pris exkl. moms (kr)">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.unitPriceKr}
                      onChange={set("unitPriceKr")}
                      className={cls}
                    />
                  </Field>
                </div>
                <Field label="Valuta">
                  <input value={form.currency ?? "SEK"} onChange={set("currency")} maxLength={3} className={cls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Momssats (%)">
                  <select value={form.taxRatePct} onChange={set("taxRatePct")} className={cls}>
                    <option value="25">25%</option>
                    <option value="12">12%</option>
                    <option value="6">6%</option>
                    <option value="0">0%</option>
                  </select>
                </Field>
                <Field label="Enhet">
                  <input value={form.unit ?? "st"} onChange={set("unit")} className={cls} />
                </Field>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={save} loading={saving}>Spara</Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false)
                setError("")
                if (product) {
                  setForm({
                    ...product,
                    unitPriceKr: (product.unitPrice / 100).toFixed(2),
                    taxRatePct: (Number(product.taxRate) * 100).toFixed(0),
                  })
                }
              }}
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}
