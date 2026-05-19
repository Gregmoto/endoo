"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

type CustomerItem = { rank: number; contactId: string | null; name: string; total: number; barWidth: number }

function fmtMoney(n: number) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n/1000).toFixed(0)}k`
  return String(Math.round(n))
}

export function TopCustomers({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<CustomerItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const year = new Date().getFullYear()
    fetch(`/api/dashboard/top-customers?year=${year}&limit=5`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { setItems(d.items ?? []); setLoading(false) })
  }, [])

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">Topp 5 kunder YTD</h2>
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Ingen faktureringsdata ännu</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.rank} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">{item.rank}</span>
              <div className="flex-1 min-w-0">
                {item.contactId ? (
                  <Link href={`/${orgSlug}/contacts/${item.contactId}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                    {item.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-foreground truncate block">{item.name}</span>
                )}
                <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${item.barWidth}%` }} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{fmtMoney(item.total)} kr</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
