"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { DeadlineItem, DeadlineType } from "@/app/api/agency/deadlines/route"

const TYPE_LABELS: Record<DeadlineType, string> = {
  vat:         "Moms",
  fiscal_year: "Räkenskapsår",
  invoice:     "Faktura",
  signature:   "Signatur",
}

const TYPE_ICONS: Record<DeadlineType, string> = {
  vat:         "📊",
  fiscal_year: "📅",
  invoice:     "💰",
  signature:   "✍️",
}

const FILTERS: { value: DeadlineType | "all"; label: string }[] = [
  { value: "all",         label: "Allt"          },
  { value: "vat",         label: "Moms"          },
  { value: "fiscal_year", label: "Räkenskapsår"  },
  { value: "invoice",     label: "Fakturor"      },
  { value: "signature",   label: "Signaturer"    },
]

function urgencyClasses(daysLeft: number): { bar: string; text: string } {
  if (daysLeft < 0)   return { bar: "bg-destructive", text: "text-destructive" }
  if (daysLeft <= 7)  return { bar: "bg-destructive", text: "text-destructive" }
  if (daysLeft <= 30) return { bar: "bg-amber-500",   text: "text-amber-600"   }
  return { bar: "bg-muted-foreground/30", text: "text-muted-foreground" }
}

function dueBadge(daysLeft: number) {
  if (daysLeft < 0)   return `${Math.abs(daysLeft)} dag${Math.abs(daysLeft) !== 1 ? "ar" : ""} försenad`
  if (daysLeft === 0) return "Förfaller idag"
  return `om ${daysLeft} dag${daysLeft !== 1 ? "ar" : ""}`
}

export default function AgencyDeadlinesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const [items,   setItems]   = useState<DeadlineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<DeadlineType | "all">("all")
  const [client,  setClient]  = useState("")

  useEffect(() => {
    fetch("/api/agency/deadlines")
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { setItems(d.items ?? []); setLoading(false) })
  }, [])

  const clients = Array.from(
    new Map(items.map(i => [i.clientId, { id: i.clientId, name: i.clientName }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "sv"))

  const filtered = items.filter(i => {
    if (filter !== "all" && i.type !== filter) return false
    if (client && i.clientId !== client) return false
    return true
  })

  // Section buckets
  const overdue   = filtered.filter(i => i.daysLeft < 0)
  const urgent    = filtered.filter(i => i.daysLeft >= 0 && i.daysLeft <= 7)
  const upcoming  = filtered.filter(i => i.daysLeft > 7  && i.daysLeft <= 30)
  const later     = filtered.filter(i => i.daysLeft > 30)

  const sections = [
    { label: "Försenade",      items: overdue,  accent: "text-destructive",       dot: "bg-destructive"         },
    { label: "Denna vecka",    items: urgent,   accent: "text-destructive",       dot: "bg-destructive"         },
    { label: "Denna månad",    items: upcoming, accent: "text-amber-600",         dot: "bg-amber-500"           },
    { label: "Senare",         items: later,    accent: "text-muted-foreground",  dot: "bg-muted-foreground/30" },
  ].filter(s => s.items.length > 0)

  function DeadlineRow({ item }: { item: DeadlineItem }) {
    const urg = urgencyClasses(item.daysLeft)
    return (
      <a
        href={`/${orgSlug}${item.url}`}
        className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent transition-colors group"
      >
        <div className={`w-1 self-stretch rounded-full shrink-0 ${urg.bar}`} />
        <span className="text-base mt-0.5 shrink-0">{TYPE_ICONS[item.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">{item.clientName}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{TYPE_LABELS[item.type]}</span>
          </div>
          <p className="text-sm font-medium text-foreground truncate mt-0.5">{item.title}</p>
          {item.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
          )}
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className={`text-xs font-medium ${urg.text}`}>{dueBadge(item.daysLeft)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(item.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
          </p>
        </div>
      </a>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Deadlines</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kommande och försenade frister hos dina klienter (90 dagar)</p>
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
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-18 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-foreground">Inga deadlines inom 90 dagar</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter !== "all" ? "Prova att ta bort filtret" : "Alla frister är under kontroll"}
          </p>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="mt-3 text-sm text-brand-600 hover:underline"
            >
              Visa alla
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-7 pb-10">
          {sections.map(section => (
            <div key={section.label}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${section.dot}`} />
                <h2 className={`text-xs font-semibold uppercase tracking-wide ${section.accent}`}>
                  {section.label}
                </h2>
                <span className="text-xs text-muted-foreground">({section.items.length})</span>
              </div>
              <div className="space-y-1.5">
                {section.items.map(item => (
                  <DeadlineRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
