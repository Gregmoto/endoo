"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { formatMoney } from "@/lib/utils"

type ApprovalItem = {
  id: string
  invoiceNumber: string | null
  amountInclVat: bigint | null
  createdAt: string
  supplier: { name: string } | null
}

function ageLabel(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Idag"
  if (days === 1) return "Igår"
  return `${days} dagar sedan`
}

export function ApprovalsWidget({ orgSlug }: { orgSlug: string }) {
  const [data, setData] = useState<{ count: number; items: ApprovalItem[] }>({ count: 0, items: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/approvals")
      .then(r => r.ok ? r.json() : { count: 0, items: [] })
      .then(d => { setData(d); setLoading(false) })
  }, [])

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">
          Att granska {!loading && <span className="text-muted-foreground">({data.count})</span>}
        </h2>
        <Link href={`/${orgSlug}/supplier-invoices?status=pending_approval`} className="text-xs text-primary hover:underline">
          Visa alla →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2">
          <span className="text-2xl">✅</span>
          <p className="text-xs text-muted-foreground">Inga väntande attesteringar</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {data.items.map(item => (
            <li key={item.id}>
              <Link
                href={`/${orgSlug}/supplier-invoices/${item.id}`}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.supplier?.name ?? "Okänd"}</p>
                  <p className="text-xs text-muted-foreground">{item.invoiceNumber ?? "—"} · {ageLabel(item.createdAt)}</p>
                </div>
                <span className="text-sm font-medium text-foreground tabular-nums flex-shrink-0">
                  {formatMoney(item.amountInclVat ?? 0)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
