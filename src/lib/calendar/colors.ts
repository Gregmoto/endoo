// Calendar event color palette — these are user-facing color picker options
// stored in the DB per event. Hex values are required for inline styles.
export const CALENDAR_EVENT_COLORS = [
  "#6366f1", // audit-ok — event color palette (stored in DB)
  "#10b981", // audit-ok — event color palette (stored in DB)
  "#f59e0b", // audit-ok — event color palette (stored in DB)
  "#ef4444", // audit-ok — event color palette (stored in DB)
  "#8b5cf6", // audit-ok — event color palette (stored in DB)
  "#06b6d4", // audit-ok — event color palette (stored in DB)
] as const

export const DEFAULT_EVENT_COLOR = CALENDAR_EVENT_COLORS[0]
