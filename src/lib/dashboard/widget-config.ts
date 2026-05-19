export type WidgetId =
  | "today-overview"
  | "approvals"
  | "kpi-row"
  | "calendar"
  | "quick-actions"
  | "revenue-chart"
  | "top-customers"
  | "recent-activity"

export const WIDGET_CONFIG: { id: WidgetId; label: string }[] = [
  { id: "today-overview",  label: "Dagens översikt" },
  { id: "approvals",       label: "Attesteringar" },
  { id: "kpi-row",         label: "KPI-rad" },
  { id: "calendar",        label: "Kalender" },
  { id: "quick-actions",   label: "Snabbåtgärder" },
  { id: "revenue-chart",   label: "Intäkter 12 mån" },
  { id: "top-customers",   label: "Topp 5 kunder" },
  { id: "recent-activity", label: "Senaste aktivitet" },
]
