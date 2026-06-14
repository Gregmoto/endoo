"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { InboxItem, InboxItemType } from "@/app/api/agency/inbox/route"

const TYPE_LABELS: Record<InboxItemType, string> = {
  supplier_invoice: "Leverantörsfaktura",
  approval:         "Attest",
  signature:        "Signatur",
  task:             "Uppgift",
}

const TYPE_ICONS: Record<InboxItemType, string> = {
  supplier_invoice: "📄",
  approval:         "✅",
  signature:        "✍️",
  task:             "🗒️",
}

const FILTERS: { value: InboxItemType | "all"; label: string }[] = [
  { value: "all",              label: "Allt"               },
  { value: "supplier_invoice", label: "Leverantörsfakturor" },
  { value: "approval",         label: "Attester"           },
  { value: "signature",        label: "Signaturer"         },
  { value: "task",             label: "Uppgifter"          },
]

function dueBadge(dateStr: string | null) {
  if (!dateStr) return null
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  if (days < 0)  return <span className="text-xs font-medium text-destructive">{Math.abs(days)} dag{Math.abs(days) !== 1 ? "ar" : ""} försenad</span>
  if (days === 0) return <span className="text-xs font-medium text-destructive">Förfaller idag</span>
  if (days <= 3)  return <span className="text-xs font-medium text-destructive">om {days} dag{days !== 1 ? "ar" : ""}</span>
  if (days <= 14) return <span className="text-xs font-medium text-amber-600">om {days} dagar</span>
  return <span className="text-xs text-muted-foreground">om {days} dagar</span>
}

export default function AgencyInboxPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const [items,   setItems]   = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<InboxItemType | "all">("all")
  const [client,  setClient]  = useState("")

  useEffect(() => {
    fetch("/api/agency/inbox")
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { setItems(d.items ?? []); setLoading(false) })
  }, [])

  // Unique clients for client filter
  const clients = Array.from(
    new Map(items.map(i => [i.clientId, { id: i.clientId, name: i.clientName }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "sv"))

  const filtered = items.filter(i => {
    if (filter !== "all" && i.type !== filter) return false
    if (client && i.clientId !== client) return false
    return true
  })

  // Group by client
  const groups = new Map<string, { name: string; slug: string; items: InboxItem[] }>()
  for (const item of filtered) {
    if (!groups.has(item.clientId)) {
      groups.set(item.clientId, { name: item.clientName, slug: item.clientSlug, items: [] })
    }
    groups.get(item.clientId)!.items.push(item)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Inkorg</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Åtgärder som väntar på dig hos dina klienter</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                filter === f.value
                  ? "bg-brand-100 text-brand-700"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1 opacity-60">
                  ({items.filter(i => i.type === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {clients.length > 1 && (
          <select
            value={client}
            onChange={e => setClient(e.target.value)}
            className="ml-auto text-xs border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-brand-400"
          >
            <option value="">Alla klienter</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">✓</p>
          <p className="font-medium text-foreground">Allt är hanterat</p>
          <p className="text-sm text-muted-foreground mt-1">Inga åtgärder väntar på dig just nu</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([clientId, group]) => (
            <div key={clientId}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-foreground">{group.name}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <Link
                  href={`/${orgSlug}/${group.slug}/overview`}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Öppna klient
                </Link>
              </div>

              <div className="space-y-1.5">
                {group.items.map(item => (
                  <a
                    key={item.id}
                    href={`/${orgSlug}${item.url}`}
                    className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent transition-colors group"
                  >
                    <span className="text-lg mt-0.5 shrink-0">{TYPE_ICONS[item.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {TYPE_LABELS[item.type]}
                        </span>
                        {item.dueDate && dueBadge(item.dueDate)}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate mt-0.5">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                      →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
