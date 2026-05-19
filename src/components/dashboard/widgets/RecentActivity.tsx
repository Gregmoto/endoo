"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

type FeedItem = {
  id: string
  title: string
  body: string | null
  href: string | null
  iconKey: string | null
  createdAt: string
}

function fmtTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Igår"
  if (diffDays < 7) return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
}

const ICON_MAP: Record<string, string> = {
  invoice_created: "📄",
  invoice_sent: "📤",
  invoice_paid: "✅",
  payment_received: "💰",
  contact_created: "👤",
  invoice_overdue: "🔴",
}

export function RecentActivity({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function load() {
      fetch("/api/dashboard/recent-activity")
        .then(r => r.ok ? r.json() : { items: [] })
        .then(d => { setItems(d.items ?? []); setLoading(false) })
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Senaste aktivitet</h2>
        <Link href={`/${orgSlug}/activity`} className="text-xs text-primary hover:underline">Visa alla →</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Ingen aktivitet än</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {items.map(item => (
            <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
              {item.href ? (
                <Link href={item.href} className="flex items-start gap-3 hover:bg-accent/50 rounded-lg px-2 py-1 -mx-2 transition-colors">
                  <span className="text-base leading-none w-5 text-center flex-shrink-0 mt-0.5">
                    {ICON_MAP[item.iconKey ?? ""] ?? "•"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.title}</p>
                    {item.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.body}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{fmtTime(item.createdAt)}</span>
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-2 py-1">
                  <span className="text-base leading-none w-5 text-center flex-shrink-0 mt-0.5">
                    {ICON_MAP[item.iconKey ?? ""] ?? "•"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.title}</p>
                    {item.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.body}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{fmtTime(item.createdAt)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
