export interface Alert {
  type:     string
  severity: "error" | "warning" | "info"
  message:  string
  count?:   number
}

export interface OnboardingChecks {
  hasChartOfAccounts: boolean
  hasFiscalYear:      boolean
  hasOrgInfo:         boolean
  hasFirstInvoice:    boolean
  hasVatConfig:       boolean
  hasBankDetails:     boolean
}

export interface SnapshotClient {
  id:                      string
  agencyId:                string
  clientId:                string
  clientName:              string
  clientSlug:              string
  healthScore:             number
  overdueInvoiceCount:     number
  overdueAmountOre:        number
  unbookedSupplierCount:   number
  openAiAnomalyCount:      number
  pendingAiSuggestionCount:number
  daysSinceLastActivity:   number | null
  nextVatDeadlineAt:       string | null
  vatDeadlineDaysLeft:     number | null
  fiscalYearEndsAt:        string | null
  fiscalYearDaysLeft:      number | null
  onboardingDone:          boolean
  onboardingChecks:        OnboardingChecks | Record<string, boolean>
  alerts:                  Alert[]
  alertCount:              number
  errorCount:              number
  warningCount:            number
  computedAt:              string
}

export interface AgencyKpis {
  totalClients:     number
  actionNeeded:     number
  missingDocs:      number
  atRisk:           number
  vatDueSoon:       number
  totalAiAnomalies: number
  avgHealthScore:   number
}
