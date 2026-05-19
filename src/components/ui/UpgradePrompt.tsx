"use client"

import Link        from "next/link"
import type { Plan } from "@prisma/client"
import {
  PLAN_LABELS,
  requiredPlanForFeature,
  type PlanFeature,
} from "@/lib/plans/limits"

const FEATURE_LABELS: Record<PlanFeature, string> = {
  ai_assistant:          "AI-assistent",
  ai_anomaly_detection:  "AI-avvikelsedetektering",
  recurring_invoices:    "Återkommande fakturor",
  agency_mode:           "Byråläge",
  custom_branding:       "Anpassad varumärkning",
  advanced_reports:      "Avancerade rapporter",
  basic_reports:         "Rapporter",
  sie_export:            "SIE-export",
  vat_periods:           "Momsperioder",
  approval_workflows:    "Godkännandeflöden",
  dimensions:            "Dimensioner",
  multi_currency:        "Flera valutor",
  api_access:            "API-åtkomst",
  webhooks_outgoing:     "Webhooks",
  time_tracking:         "Tidsregistrering",
  project_accounting:    "Projektredovisning",
  e_signing:             "E-signering",
  quotes:                "Offerter",
  inventory:             "Lagerhantering",
  supplier_invoices:     "Leverantörsfakturor",
  customer_portal:       "Kundportal",
  fixed_assets:          "Anläggningstillgångar",
  accruals:              "Periodiseringar",
  data_import:           "Dataimport",
  sru_export:                    "SRU-export",
  multiple_price_lists:          "Flera prislistor",
  multiple_invoice_templates:    "Flera fakturamallar",
  invoice_export:                "Fakturaexport",
  interest_invoices:             "Räntefakturor",
  bulk_actions:                  "Massåtgärder",
}

interface Props {
  feature:     PlanFeature
  currentPlan: Plan
  /** Compact inline variant — just a lock badge with tooltip */
  inline?:     boolean
}

export function UpgradePrompt({ feature, currentPlan, inline }: Props) {
  const requiredPlan = requiredPlanForFeature(feature)
  const featureLabel = FEATURE_LABELS[feature] ?? feature
  const planLabel    = PLAN_LABELS[requiredPlan]

  if (inline) {
    return (
      <span
        title={`Kräver ${planLabel}-planen`}
        className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium"
      >
        <LockIcon className="size-3" />
        {planLabel}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/50 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
        <LockIcon className="size-6" />
      </div>
      <div>
        <p className="font-semibold text-foreground">
          {featureLabel} ingår inte i din plan
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Uppgradera till <strong>{planLabel}</strong> för att använda den här funktionen.
        </p>
      </div>
      <Link
        href="./settings/billing"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Uppgradera plan
      </Link>
      <p className="text-xs text-muted-foreground">
        Nuvarande plan: {PLAN_LABELS[currentPlan]}
      </p>
    </div>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
