"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ArticleFormData {
  sku:                    string
  ean:                    string
  name:                   string
  description:            string
  manufacturer:           string
  manufacturerSku:        string
  notes:                  string
  type:                   "product" | "service"
  unit:                   string
  isActive:               boolean
  isStockItem:            boolean
  isPhasingOut:           boolean
  unitPriceKr:            string
  taxRateStr:             string
  purchasePriceKr:        string
  vatType:                string
  salesAccount:           string
  purchaseAccount:        string
  salesAccountReverseSE:  string
  salesAccountReverseEU:  string
  salesAccountVatableEU:  string
  salesAccountExport:     string
  inventoryAccount:       string
  inventoryChangeAccount: string
  width:                  string
  height:                 string
  depth:                  string
  weightGrams:            string
  warehouseLocation:      string
}

interface Props {
  mode:           "new" | "edit"
  orgSlug:        string
  articleId?:     string
  initialData?:   Partial<ArticleFormData>
  averageCostOre?: number
  onSaved?:       (id: string) => void
}

// ─── Constants ─────────────────────────────────────────────────────────────

const EMPTY: ArticleFormData = {
  sku: "", ean: "", name: "", description: "", manufacturer: "", manufacturerSku: "",
  notes: "", type: "product", unit: "st", isActive: true, isStockItem: true,
  isPhasingOut: false, unitPriceKr: "", taxRateStr: "0.25", purchasePriceKr: "",
  vatType: "SE25", salesAccount: "", purchaseAccount: "", salesAccountReverseSE: "",
  salesAccountReverseEU: "", salesAccountVatableEU: "", salesAccountExport: "",
  inventoryAccount: "", inventoryChangeAccount: "", width: "", height: "", depth: "",
  weightGrams: "", warehouseLocation: "",
}

const UNITS = ["st", "tim", "dag", "mån", "m", "m²", "m³", "kg", "l", "par", "set", "förp"]

const VAT_TYPES = [
  { value: "",              label: "— Välj —" },
  { value: "SE25",          label: "SE 25%" },
  { value: "SE12",          label: "SE 12%" },
  { value: "SE06",          label: "SE 6%" },
  { value: "SE00",          label: "SE 0% (momsfri)" },
  { value: "EU_VARU",       label: "EU varor" },
  { value: "EU_TJANST",     label: "EU tjänster" },
  { value: "EXPORT",        label: "Export" },
  { value: "OMVMOMS_BYGG",  label: "Omvänd bygg (SE)" },
  { value: "OMVMOMS_SE",    label: "Omvänd SE" },
]

const TAX_RATES = [
  { value: "0.25", label: "25%" },
  { value: "0.12", label: "12%" },
  { value: "0.06", label: "6%" },
  { value: "0",    label: "0%" },
]

const inputCls = "block w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"

// ─── Helper components ──────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      <span className="sr-only">{label}</span>
    </button>
  )
}

function ToggleRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${disabled ? "opacity-50" : ""}`}>
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={disabled ? () => {} : onChange} label={label} />
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ArticleForm({ mode, orgSlug, articleId, initialData, averageCostOre, onSaved }: Props) {
  const router        = useRouter()
  const [form, setForm]         = useState<ArticleFormData>({ ...EMPTY, ...initialData })
  const [tab, setTab]           = useState(0)
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [eanError, setEanError] = useState("")
  const autosaveTimer           = useRef<ReturnType<typeof setTimeout> | null>(null)

  const DRAFT_KEY = "article_draft_new"

  // Compute visible tabs
  const showInventory = form.type === "product" && form.isStockItem
  const allTabs = [
    "Allmän information",
    ...(mode === "edit" ? ["Pris"] : []),
    "Bokföring",
    ...(showInventory ? ["Lagerdetaljer", "Inköp"] : []),
  ]

  // Load draft on mount (new mode)
  useEffect(() => {
    if (mode !== "new") return
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) setForm(f => ({ ...f, ...JSON.parse(draft) }))
    } catch {}
  }, [mode])

  // Autosave draft
  useEffect(() => {
    if (mode !== "new") return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch {}
    }, 30000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [form, mode])

  function set<K extends keyof ArticleFormData>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function validateEanOnBlur() {
    if (!form.ean) { setEanError(""); return }
    const digits = form.ean.replace(/\D/g, "")
    if (digits.length !== 13) { setEanError("EAN-13 måste vara 13 siffror"); return }
    // Checksum
    let sum = 0
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3)
    const check = (10 - (sum % 10)) % 10
    if (check !== parseInt(digits[12])) { setEanError("Ogiltig EAN-13 checksumma"); return }
    setEanError("")
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Namn är obligatoriskt"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) { setTab(0); return }
    setSaving(true)
    setServerError("")

    const toOre = (v: string) => v ? Math.round(parseFloat(v.replace(",", ".")) * 100) : null

    const payload = {
      name:                   form.name,
      description:            form.description || null,
      sku:                    form.sku || null,
      ean:                    form.ean || null,
      manufacturer:           form.manufacturer || null,
      manufacturerSku:        form.manufacturerSku || null,
      notes:                  form.notes || null,
      type:                   form.type,
      unit:                   form.unit,
      isActive:               form.isActive,
      isStockItem:            form.type === "service" ? false : form.isStockItem,
      isPhasingOut:           form.isPhasingOut,
      unitPrice:              toOre(form.unitPriceKr) ?? 0,
      taxRate:                parseFloat(form.taxRateStr) || 0.25,
      purchasePrice:          toOre(form.purchasePriceKr),
      vatType:                form.vatType || null,
      salesAccount:           form.salesAccount || null,
      purchaseAccount:        form.purchaseAccount || null,
      salesAccountReverseSE:  form.salesAccountReverseSE || null,
      salesAccountReverseEU:  form.salesAccountReverseEU || null,
      salesAccountVatableEU:  form.salesAccountVatableEU || null,
      salesAccountExport:     form.salesAccountExport || null,
      inventoryAccount:       form.inventoryAccount || null,
      inventoryChangeAccount: form.inventoryChangeAccount || null,
      width:                  form.width ? parseInt(form.width) : null,
      height:                 form.height ? parseInt(form.height) : null,
      depth:                  form.depth ? parseInt(form.depth) : null,
      weightGrams:            form.weightGrams ? parseInt(form.weightGrams) : null,
      warehouseLocation:      form.warehouseLocation || null,
    }

    const url    = mode === "new" ? "/api/articles" : `/api/articles/${articleId}`
    const method = mode === "new" ? "POST" : "PUT"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (res.ok) {
      const data = await res.json()
      if (mode === "new") { try { localStorage.removeItem(DRAFT_KEY) } catch {} }
      if (onSaved) { onSaved(data.id) }
      else { router.push(`/${orgSlug}/articles/${data.id}`) }
    } else {
      const d = await res.json().catch(() => ({ error: "Okänt fel" }))
      setServerError(d.error ?? "Något gick fel")
    }
  }

  const inclPrice = form.unitPriceKr
    ? ((parseFloat(form.unitPriceKr.replace(",", ".") || "0") * (1 + parseFloat(form.taxRateStr || "0"))).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr")
    : null

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-20">
        {/* Tab navigation */}
        <div className="border-b border sticky top-0 bg-background z-10">
          <div className="flex overflow-x-auto px-6">
            {allTabs.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(i)}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === i
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <form id="article-form" onSubmit={handleSubmit}>
          <div className="p-6 max-w-3xl space-y-6">

            {/* ── Tab 0: Allmän information ── */}
            {tab === 0 && (
              <>
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold text-foreground">Artikelnummer & Identifiering</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Artikelnummer (SKU)">
                      <input
                        value={form.sku}
                        onChange={set("sku")}
                        placeholder={mode === "new" ? "Genereras automatiskt" : ""}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="EAN-13" hint={eanError || undefined}>
                      <input
                        value={form.ean}
                        onChange={set("ean")}
                        onBlur={validateEanOnBlur}
                        placeholder="1234567890123"
                        className={`${inputCls} ${eanError ? "border-destructive" : ""}`}
                      />
                      {eanError && <p className="text-xs text-destructive mt-1">{eanError}</p>}
                    </Field>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold text-foreground">Artikelinformation</h2>
                  <Field label="Namn *">
                    <input
                      required
                      value={form.name}
                      onChange={set("name")}
                      placeholder="Artikelns namn"
                      className={`${inputCls} ${errors.name ? "border-destructive" : ""}`}
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </Field>
                  <Field label="Beskrivning">
                    <textarea
                      value={form.description}
                      onChange={set("description")}
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Tillverkare">
                      <input value={form.manufacturer} onChange={set("manufacturer")} className={inputCls} />
                    </Field>
                    <Field label="Tillverkarens art.nr">
                      <input value={form.manufacturerSku} onChange={set("manufacturerSku")} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Interna anteckningar">
                    <textarea
                      value={form.notes}
                      onChange={set("notes")}
                      rows={3}
                      className={`${inputCls} resize-none`}
                      placeholder="Synliga bara internt"
                    />
                  </Field>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold text-foreground">Typ & Status</h2>
                  <div className="flex gap-6">
                    {(["product", "service"] as const).map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={t}
                          checked={form.type === t}
                          onChange={() => setForm(f => ({
                            ...f,
                            type: t,
                            isStockItem: t === "service" ? false : f.isStockItem,
                          }))}
                          className="accent-primary"
                        />
                        <span className="text-sm text-foreground">{t === "product" ? "Vara" : "Tjänst"}</span>
                      </label>
                    ))}
                  </div>
                  <Field label="Enhet">
                    <select value={form.unit} onChange={set("unit")} className={inputCls}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </Field>
                  <div className="space-y-1 divide-y divide-border rounded-lg border border-input px-4">
                    {form.type === "product" && (
                      <ToggleRow
                        label="Lagervara"
                        checked={form.isStockItem}
                        onChange={v => setForm(f => ({ ...f, isStockItem: v }))}
                      />
                    )}
                    <ToggleRow
                      label="Utgående artikel"
                      checked={form.isPhasingOut}
                      onChange={v => setForm(f => ({ ...f, isPhasingOut: v }))}
                    />
                    <ToggleRow
                      label="Aktiv"
                      checked={form.isActive}
                      onChange={v => setForm(f => ({ ...f, isActive: v }))}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold text-foreground">Pris</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Utpris (kr, ex moms)">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.unitPriceKr}
                        onChange={set("unitPriceKr")}
                        className={inputCls}
                        placeholder="0.00"
                      />
                    </Field>
                    <Field label="Momssats">
                      <select value={form.taxRateStr} onChange={set("taxRateStr")} className={inputCls}>
                        {TAX_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  {inclPrice && (
                    <p className="text-xs text-muted-foreground">Inkl moms: {inclPrice}</p>
                  )}
                </section>
              </>
            )}

            {/* ── Tab Pris (edit only) ── */}
            {mode === "edit" && allTabs[tab] === "Pris" && (
              <section>
                <p className="text-sm text-muted-foreground">
                  Prislistor för denna artikel redigeras på detaljsidan. Spara ändringar och gå till artikeln för att hantera prislistor.
                </p>
              </section>
            )}

            {/* ── Tab Bokföring ── */}
            {allTabs[tab] === "Bokföring" && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Momstyp</h2>
                <Field label="Momstyp">
                  <select value={form.vatType} onChange={set("vatType")} className={inputCls}>
                    {VAT_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </Field>

                <h2 className="text-sm font-semibold text-foreground mt-6">Försäljningskonton</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Försäljningskonto (SE 25%)" hint="Standard: 3001">
                    <input value={form.salesAccount} onChange={set("salesAccount")} className={inputCls} placeholder="3001" />
                  </Field>
                  <Field label="SE omvänd skattskyldighet">
                    <input value={form.salesAccountReverseSE} onChange={set("salesAccountReverseSE")} className={inputCls} placeholder="3231" />
                  </Field>
                  <Field label="EU omvänd skattskyldighet">
                    <input value={form.salesAccountReverseEU} onChange={set("salesAccountReverseEU")} className={inputCls} placeholder="3108" />
                  </Field>
                  <Field label="EU momspliktig försäljning">
                    <input value={form.salesAccountVatableEU} onChange={set("salesAccountVatableEU")} className={inputCls} placeholder="3106" />
                  </Field>
                  <Field label="Export">
                    <input value={form.salesAccountExport} onChange={set("salesAccountExport")} className={inputCls} placeholder="3105" />
                  </Field>
                </div>

                <h2 className="text-sm font-semibold text-foreground mt-2">Inköps- & lagerkonton</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Inköpskonto" hint="Standard: 4000">
                    <input value={form.purchaseAccount} onChange={set("purchaseAccount")} className={inputCls} placeholder="4000" />
                  </Field>
                  <Field label="Lagerkonto" hint="Standard: 1460">
                    <input value={form.inventoryAccount} onChange={set("inventoryAccount")} className={inputCls} placeholder="1460" />
                  </Field>
                  <Field label="Lagerförändringskonto" hint="Standard: 4990">
                    <input value={form.inventoryChangeAccount} onChange={set("inventoryChangeAccount")} className={inputCls} placeholder="4990" />
                  </Field>
                </div>
              </section>
            )}

            {/* ── Tab Lagerdetaljer ── */}
            {allTabs[tab] === "Lagerdetaljer" && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Lagersaldon</h2>
                <Field label="Lagerplats" hint="Var artikeln finns fysiskt">
                  <input value={form.warehouseLocation} onChange={set("warehouseLocation")} className={inputCls} placeholder="Rad 10, Hylla 1" />
                </Field>
                <h2 className="text-sm font-semibold text-foreground mt-2">Dimensioner</h2>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="Bredd (mm)">
                    <input type="number" min={0} value={form.width} onChange={set("width")} className={inputCls} />
                  </Field>
                  <Field label="Höjd (mm)">
                    <input type="number" min={0} value={form.height} onChange={set("height")} className={inputCls} />
                  </Field>
                  <Field label="Djup (mm)">
                    <input type="number" min={0} value={form.depth} onChange={set("depth")} className={inputCls} />
                  </Field>
                  <Field label="Vikt (gram)">
                    <input type="number" min={0} value={form.weightGrams} onChange={set("weightGrams")} className={inputCls} />
                  </Field>
                </div>
              </section>
            )}

            {/* ── Tab Inköp ── */}
            {allTabs[tab] === "Inköp" && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Inköpspris</h2>
                <Field label="Manuellt inköpspris (kr)" hint="Används om inga lagertransaktioner finns">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.purchasePriceKr}
                    onChange={set("purchasePriceKr")}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </Field>
                {mode === "edit" && averageCostOre != null && (
                  <p className="text-sm text-muted-foreground">
                    Vägd medelkostnad: <span className="font-medium text-foreground">
                      {(averageCostOre / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                    </span> (beräknad från lagertransaktioner)
                  </p>
                )}
              </section>
            )}

          </div>
        </form>

        {serverError && (
          <div className="mx-6 mt-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {serverError}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card px-6 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/${orgSlug}/articles${articleId ? `/${articleId}` : ""}`)}
          className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg transition-colors"
        >
          Avbryt
        </button>
        <button
          type="submit"
          form="article-form"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Sparar…" : mode === "new" ? "Skapa artikel" : "Spara ändringar"}
        </button>
      </div>
    </div>
  )
}
