"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SlotKey =
  | "AR" | "AP" | "BANK" | "BANK_SWISH" | "BANK_CASH"
  | "REVENUE_25" | "REVENUE_12" | "REVENUE_6" | "REVENUE_0"
  | "VAT_OUT_25" | "VAT_OUT_12" | "VAT_OUT_6" | "VAT_IN"

type AccountOption = { id: string; number: string; name: string; type: string }

const SLOT_META: { key: SlotKey; label: string; description: string; group: string }[] = [
  { key: "AR",         label: "Kundfordringar",              description: "Debiteras vid kundfaktura",           group: "Fordringar och skulder" },
  { key: "AP",         label: "Leverantörsskulder",          description: "Krediteras vid leverantörsfaktura",   group: "Fordringar och skulder" },
  { key: "BANK",       label: "Bankgiro / Affärskonto",      description: "Primärt bankkonto",                   group: "Likvida medel" },
  { key: "BANK_SWISH", label: "Plusgiro / Swish",            description: "Sekundärt konto (Swish, PlusGiro)",   group: "Likvida medel" },
  { key: "BANK_CASH",  label: "Kassa",                       description: "Kontanthantering",                    group: "Likvida medel" },
  { key: "REVENUE_25", label: "Försäljning 25% moms",        description: "Standardintäktskonto 25% moms",       group: "Intäktskonton" },
  { key: "REVENUE_12", label: "Försäljning 12% moms",        description: "Intäktskonto 12% moms",               group: "Intäktskonton" },
  { key: "REVENUE_6",  label: "Försäljning 6% moms",         description: "Intäktskonto 6% moms",                group: "Intäktskonton" },
  { key: "REVENUE_0",  label: "Försäljning momsfri",         description: "Intäktskonto momsfri",                group: "Intäktskonton" },
  { key: "VAT_OUT_25", label: "Utgående moms 25%",           description: "Krediteras vid fakturering 25% moms", group: "Momskonton" },
  { key: "VAT_OUT_12", label: "Utgående moms 12%",           description: "Krediteras vid fakturering 12% moms", group: "Momskonton" },
  { key: "VAT_OUT_6",  label: "Utgående moms 6%",            description: "Krediteras vid fakturering 6% moms",  group: "Momskonton" },
  { key: "VAT_IN",     label: "Ingående moms",               description: "Debiteras vid leverantörsfaktura",    group: "Momskonton" },
]

const GROUPS = ["Fordringar och skulder", "Likvida medel", "Intäktskonton", "Momskonton"]

export default function AccountMappingsPage() {
  const [mappings,  setMappings]  = useState<Record<string, string>>({})
  const [defaults,  setDefaults]  = useState<Record<string, string>>({})
  const [accounts,  setAccounts]  = useState<AccountOption[]>([])
  const [dirty,     setDirty]     = useState<Record<string, string>>({})
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [search,    setSearch]    = useState<Record<string, string>>({})
  const [open,      setOpen]      = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  void dropdownRef // used in event listener only

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/account-mappings").then(r => r.json()),
      fetch("/api/accounting/accounts?isActive=true&level=3").then(r => r.json()),
    ]).then(([m, a]) => {
      setMappings(m.mappings ?? {})
      setDefaults(m.defaults ?? {})
      setAccounts(a.accounts ?? [])
    })
  }, [])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  function getCurrent(key: SlotKey): string {
    return dirty[key] ?? mappings[key] ?? defaults[key] ?? ""
  }

  function getAccount(number: string): AccountOption | undefined {
    return accounts.find(a => a.number === number)
  }

  function filterAccounts(slotKey: string): AccountOption[] {
    const q = (search[slotKey] ?? "").toLowerCase()
    if (!q) return accounts.slice(0, 50)
    return accounts.filter(a =>
      a.number.startsWith(q) || a.name.toLowerCase().includes(q)
    ).slice(0, 50)
  }

  function select(slotKey: string, number: string) {
    setDirty(d => ({ ...d, [slotKey]: number }))
    setSearch(s => ({ ...s, [slotKey]: "" }))
    setOpen(null)
  }

  async function save() {
    if (!Object.keys(dirty).length) return
    setSaving(true)
    setError(null)
    const res = await fetch("/api/settings/account-mappings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dirty),
    })
    setSaving(false)
    if (res.ok) {
      setMappings(m => ({ ...m, ...dirty }))
      setDirty({})
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const d = await res.json()
      setError(d.error ?? "Kunde inte spara")
    }
  }

  function resetSlot(key: SlotKey) {
    setDirty(d => ({ ...d, [key]: defaults[key] }))
  }

  const hasDirty = Object.keys(dirty).length > 0

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kontomappningar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Välj vilka konton i din kontoplan som används för automatbokningar.
          Standardvärden hämtas från BAS 2026.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      {saved && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg border border-green-200 dark:border-green-800">
          ✓ Kontomappningarna sparades
        </div>
      )}

      {GROUPS.map(group => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SLOT_META.filter(s => s.group === group).map(slot => {
              const current = getCurrent(slot.key)
              const account = getAccount(current)
              const isModified = dirty[slot.key] !== undefined
              const isDefault = current === defaults[slot.key]
              const filtered = filterAccounts(slot.key)

              return (
                <div key={slot.key} className="grid grid-cols-[1fr_auto] gap-3 items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {slot.label}
                      </label>
                      {isModified && !isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                          ändrat
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{slot.description}</p>

                    {/* Combobox */}
                    <div className="relative mt-2">
                      <button
                        type="button"
                        onClick={() => setOpen(open === slot.key ? null : slot.key)}
                        className="w-full text-left px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {account
                          ? <span><span className="font-mono text-indigo-600 dark:text-indigo-400">{account.number}</span> — {account.name}</span>
                          : <span className="text-gray-400">{current || "Välj konto…"}</span>
                        }
                      </button>

                      {open === slot.key && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                            <Input
                              autoFocus
                              placeholder="Sök kontonummer eller namn…"
                              value={search[slot.key] ?? ""}
                              onChange={e => setSearch(s => ({ ...s, [slot.key]: e.target.value }))}
                              className="text-sm"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filtered.length === 0 ? (
                              <p className="px-3 py-2 text-sm text-gray-400">Inga konton hittades</p>
                            ) : filtered.map(a => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => select(slot.key, a.number)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
                                  a.number === current ? "bg-indigo-50 dark:bg-indigo-900/20 font-medium" : ""
                                }`}
                              >
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-2">{a.number}</span>
                                <span className="text-gray-700 dark:text-gray-300">{a.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reset button */}
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => resetSlot(slot.key)}
                      className="mt-8 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Återställ till BAS-standard"
                    >
                      Återställ
                    </button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!hasDirty || saving} loading={saving}>
          Spara mappningar
        </Button>
        {hasDirty && (
          <button
            type="button"
            onClick={() => setDirty({})}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Ångra ändringar
          </button>
        )}
      </div>
    </div>
  )
}
