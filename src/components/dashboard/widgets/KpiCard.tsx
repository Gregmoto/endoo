"use client"
import Link from "next/link"
import { formatMoney } from "@/lib/utils"

interface Props {
  label: string
  value: number
  hint?: string
  href: string
  valueColor?: "default" | "green" | "red"
  loading?: boolean
}

export function KpiCard({ label, value, hint, href, valueColor = "default", loading }: Props) {
  const colorCls = valueColor === "green" ? "text-green-600 dark:text-green-400"
                 : valueColor === "red"   ? "text-destructive"
                 : "text-foreground"

  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5 hover:shadow-md transition-shadow group"
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading ? (
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      ) : (
        <p className={`text-2xl font-bold tabular-nums ${colorCls}`}>
          {formatMoney(value)}
        </p>
      )}
      {hint && !loading && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </Link>
  )
}
