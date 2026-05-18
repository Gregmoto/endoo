import type { AgencyKpis } from "./types"

interface Props {
  kpis:            AgencyKpis
  activeFilter:    string
  onFilterChange:  (f: string) => void
}

export function AgencyKpiStrip({ kpis, activeFilter, onFilterChange }: Props) {
  const tiles = [
    {
      key:   "all",
      label: "Klienter totalt",
      value: kpis.totalClients,
      sub:   `Snitt hälsa: ${kpis.avgHealthScore}%`,
      color: "text-gray-900",
      bg:    "bg-white",
    },
    {
      key:   "action_needed",
      label: "Behöver åtgärd",
      value: kpis.actionNeeded,
      sub:   "med aktiva varningar",
      color: kpis.actionNeeded > 0 ? "text-red-700"    : "text-gray-400",
      bg:    kpis.actionNeeded > 0 ? "bg-red-50"       : "bg-white",
    },
    {
      key:   "missing_docs",
      label: "Saknar underlag",
      value: kpis.missingDocs,
      sub:   "ej bokförda lev.fakturor",
      color: kpis.missingDocs > 0 ? "text-yellow-700" : "text-gray-400",
      bg:    kpis.missingDocs > 0 ? "bg-yellow-50"    : "bg-white",
    },
    {
      key:   "at_risk",
      label: "Vid risk",
      value: kpis.atRisk,
      sub:   "hälsoscope < 60",
      color: kpis.atRisk > 0 ? "text-orange-700" : "text-gray-400",
      bg:    kpis.atRisk > 0 ? "bg-orange-50"    : "bg-white",
    },
    {
      key:   "vat_soon",
      label: "Moms < 30 dagar",
      value: kpis.vatDueSoon,
      sub:   "förfaller snart",
      color: kpis.vatDueSoon > 0 ? "text-indigo-700" : "text-gray-400",
      bg:    kpis.vatDueSoon > 0 ? "bg-indigo-50"    : "bg-white",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {tiles.map(t => (
        <button
          key={t.key}
          onClick={() => onFilterChange(t.key === "vat_soon" ? "all" : t.key)}
          className={`${t.bg} rounded-xl px-4 py-3 text-left border transition-all ${
            activeFilter === t.key
              ? "border-brand-400 ring-1 ring-brand-400 shadow-sm"
              : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
          }`}
        >
          <p className={`text-2xl font-bold tabular-nums ${t.color}`}>{t.value}</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{t.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.sub}</p>
        </button>
      ))}
    </div>
  )
}
