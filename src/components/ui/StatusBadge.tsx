import { cn } from "@/lib/utils"

// ─── Status definitions ───────────────────────────────────────────────────────
// Single source of truth for all status colors in the app.
// Uses semantic tokens so it works in both light and dark mode automatically.

const STATUS_STYLES: Record<string, string> = {
  draft:             "bg-muted text-muted-foreground border-border",
  sent:              "bg-info/10 text-info border-info/30",
  viewed:            "bg-info/15 text-info border-info/40",
  partial:           "bg-warning/15 text-warning-foreground border-warning/40",
  paid:              "bg-success/15 text-success border-success/40",
  overdue:           "bg-destructive/15 text-destructive border-destructive/40",
  void:              "bg-muted/50 text-muted-foreground border-border line-through",
  voided:            "bg-muted/50 text-muted-foreground border-border line-through",
  extracting:        "bg-info/10 text-info border-info/30 animate-pulse",
  needs_review:      "bg-warning/15 text-warning-foreground border-warning/40",
  pending_approval:  "bg-warning/15 text-warning-foreground border-warning/40",
  approved:          "bg-success/15 text-success border-success/40",
  booked:            "bg-success/20 text-success border-success/50",
  rejected:          "bg-destructive/15 text-destructive border-destructive/40",
  posted:            "bg-success/15 text-success border-success/40",
  open:              "bg-info/10 text-info border-info/30",
  locked:            "bg-warning/15 text-warning-foreground border-warning/40",
  closed:            "bg-muted text-muted-foreground border-border",
  active:            "bg-success/15 text-success border-success/40",
  inactive:          "bg-muted text-muted-foreground border-border",
  pending:           "bg-warning/15 text-warning-foreground border-warning/40",
  error:             "bg-destructive/15 text-destructive border-destructive/40",
  cancelled:         "bg-muted text-muted-foreground border-border",
  expired:           "bg-muted text-muted-foreground border-border",
  processing:        "bg-info/10 text-info border-info/30 animate-pulse",
  signed:            "bg-success/15 text-success border-success/40",
  awaiting:          "bg-warning/15 text-warning-foreground border-warning/40",
  failed:            "bg-destructive/15 text-destructive border-destructive/40",
  completed:         "bg-success/15 text-success border-success/40",
  skipped:           "bg-muted text-muted-foreground border-border",
}

const LABELS: Record<string, string> = {
  draft:             "Utkast",
  sent:              "Skickad",
  viewed:            "Visad",
  partial:           "Delbetalad",
  paid:              "Betald",
  overdue:           "Förfallen",
  void:              "Makulerad",
  voided:            "Makulerad",
  extracting:        "Tolkar…",
  needs_review:      "Granskning",
  pending_approval:  "Väntar godkänn.",
  approved:          "Godkänd",
  booked:            "Bokförd",
  rejected:          "Nekad",
  posted:            "Bokförd",
  open:              "Öppen",
  locked:            "Låst",
  closed:            "Stängd",
  active:            "Aktiv",
  inactive:          "Inaktiv",
  pending:           "Väntande",
  error:             "Fel",
  cancelled:         "Avbruten",
  expired:           "Utgången",
  processing:        "Bearbetar…",
  signed:            "Signerad",
  awaiting:          "Väntar",
  failed:            "Misslyckad",
  completed:         "Slutförd",
  skipped:           "Hoppades",
}

interface StatusBadgeProps {
  status: string
  label?: string
  size?: "sm" | "md"
  className?: string
}

export function StatusBadge({ status, label, size = "sm", className }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border"
  const displayLabel = label ?? LABELS[status] ?? status

  return (
    <span
      className={cn(
        "inline-flex items-center border font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        styles,
        className
      )}
    >
      {displayLabel}
    </span>
  )
}

// Type-safe status values for compile-time checking
export type StatusValue = keyof typeof STATUS_STYLES
