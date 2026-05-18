"use client"

interface Props {
  label:    string
  current:  number
  max:      number | null  // null = unlimited
  pct:      number         // 0-100, pre-computed
  unit?:    string
}

export function UsageBar({ label, current, max, pct, unit = "" }: Props) {
  const isUnlimited = max === null || max >= 9999
  const color =
    pct >= 90 ? "bg-red-500"
    : pct >= 70 ? "bg-amber-500"
    : "bg-indigo-500"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {isUnlimited
            ? <span className="text-green-600 dark:text-green-400">{current}{unit} / ∞</span>
            : <>{current}{unit} / {max}{unit}</>
          }
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
