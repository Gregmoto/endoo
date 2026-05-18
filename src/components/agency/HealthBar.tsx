interface HealthBarProps {
  score:    number
  showLabel?: boolean
  size?:    "sm" | "md"
}

export function HealthBar({ score, showLabel = true, size = "md" }: HealthBarProps) {
  const color =
    score >= 80 ? "bg-green-400" :
    score >= 60 ? "bg-yellow-400" :
    score >= 40 ? "bg-orange-400" : "bg-red-400"

  const h = size === "sm" ? "h-1" : "h-1.5"

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`flex-1 ${h} bg-muted rounded-full overflow-hidden`} style={{ minWidth: 48 }}>
        <div
          className={`${h} rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs tabular-nums font-medium flex-shrink-0 ${
          score >= 80 ? "text-green-700" :
          score >= 60 ? "text-yellow-700" :
          score >= 40 ? "text-orange-700" : "text-red-700"
        }`}>
          {score}
        </span>
      )}
    </div>
  )
}

export function healthLabel(score: number) {
  if (score >= 80) return { label: "Bra",    cls: "text-green-700  bg-green-50"  }
  if (score >= 60) return { label: "OK",     cls: "text-yellow-700 bg-yellow-50" }
  if (score >= 40) return { label: "Risk",   cls: "text-orange-700 bg-orange-50" }
  return              { label: "Kritisk", cls: "text-red-700    bg-red-50"    }
}
