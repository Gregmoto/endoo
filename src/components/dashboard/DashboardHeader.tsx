"use client"
interface Props {
  onCustomize: () => void
}

export function DashboardHeader({ onCustomize }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-bold text-foreground">Översikt</h1>
      <button
        onClick={onCustomize}
        className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
      >
        ⚙ Anpassa
      </button>
    </div>
  )
}
