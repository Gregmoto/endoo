"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

type Item = { id: string; type: string; severity: string; title: string; count: number; href: string }

function greeting() {
  const h = new Date().getHours()
  if (h >= 6 && h < 11) return "God morgon"
  if (h >= 11 && h < 17) return "God dag"
  if (h >= 17 && h < 22) return "God kväll"
  return "God natt"
}

function fmtDate() {
  return new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

const ICONS: Record<string, string> = {
  overdue_invoices: "🔴",
  pending_approvals: "📋",
  ai_anomalies: "⚠️",
  vat_deadline: "📊",
  fiscal_year_end: "📅",
  unmatched_payments: "💰",
  old_drafts: "✏️",
}

export function TodayOverview({ userName }: { userName: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/today-overview")
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { setItems(d.items ?? []); setLoading(false) })
  }, [])

  const firstName = userName.split(" ")[0]

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{greeting()}, {firstName}! 👋</h2>
        <p className="text-sm text-muted-foreground capitalize">{fmtDate()}</p>
      </div>

      {loading ? (
        <div className="flex-1 space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-4xl">✅</span>
          <p className="text-sm text-muted-foreground text-center">Inga uppgifter idag. Njut av din dag! ☀️</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {items.map(item => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-sm text-foreground"
              >
                <span className="text-base leading-none w-5 text-center flex-shrink-0">
                  {ICONS[item.type] ?? "•"}
                </span>
                <span className="flex-1">{item.title}</span>
                <span className="text-muted-foreground text-xs">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
