// audit-ok: chart palette needs hardcoded hex (chart libraries don't accept CSS variables)
export const CHART = {
  indigo:   "#6366f1", // audit-ok
  violet:   "#8b5cf6", // audit-ok
  pink:     "#ec4899", // audit-ok
  cyan:     "#06b6d4", // audit-ok
  blue:     "#3b82f6", // audit-ok
  emerald:  "#10b981", // audit-ok
  green:    "#22c55e", // audit-ok
  amber:    "#f59e0b", // audit-ok
  orange:   "#f97316", // audit-ok
  red:      "#ef4444", // audit-ok
  redLight: "#f87171", // audit-ok
} as const
