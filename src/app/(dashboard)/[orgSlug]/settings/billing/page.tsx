"use client"

import { useState, useEffect } from "react"
import { useSearchParams }     from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button }    from "@/components/ui/button"
import { UsageBar }  from "@/components/ui/UsageBar"
import { PLAN_LIMITS, PLAN_LABELS, PLAN_PRICES, type PlanFeature } from "@/lib/plans/limits"
import type { Plan } from "@prisma/client"

type PlanData = {
  plan:      Plan
  planLabel: string
  planPrice: string
  features:  PlanFeature[]
  limits: {
    maxUsers:            number
    maxInvoicesPerMonth: number
    maxContacts:         number
    maxProducts:         number
    maxApiKeys:          number
    maxStorageBytes:     number
  }
  usage: {
    users:             number
    invoicesThisMonth: number
    contacts:          number
    products:          number
    apiKeys:           number
  }
  usagePct: {
    users:             number
    invoicesThisMonth: number
    contacts:          number
    products:          number
    apiKeys:           number
  }
}

type BillingData = {
  stripeSubscriptionId: string | null
  sub: { status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null
}

const FEATURE_MATRIX: { key: PlanFeature; label: string }[] = [
  { key: "basic_reports",      label: "Rapporter" },
  { key: "quotes",             label: "Offerter" },
  { key: "recurring_invoices", label: "Återkommande fakturor" },
  { key: "sie_export",         label: "SIE-export" },
  { key: "vat_periods",        label: "Momsperioder" },
  { key: "e_signing",          label: "E-signering" },
  { key: "supplier_invoices",  label: "Leverantörsfakturor" },
  { key: "customer_portal",    label: "Kundportal" },
  { key: "inventory",          label: "Lagerhantering" },
  { key: "api_access",         label: "API-åtkomst" },
  { key: "advanced_reports",   label: "Avancerade rapporter" },
  { key: "multi_currency",     label: "Flera valutor" },
  { key: "webhooks_outgoing",  label: "Webhooks" },
  { key: "approval_workflows", label: "Godkännandeflöden" },
  { key: "ai_assistant",       label: "AI-assistent" },
  { key: "agency_mode",        label: "Byråläge" },
  { key: "custom_branding",    label: "Anpassad varumärkning" },
  { key: "time_tracking",      label: "Tidsregistrering" },
]

const ALL_PLANS: Plan[] = ["free", "starter", "pro", "enterprise"]

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [plan, setPlan]         = useState<PlanData | null>(null)
  const [billing, setBilling]   = useState<BillingData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [upgrading, setUpgrading]       = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)
  const success   = searchParams.get("success")   === "1"
  const cancelled = searchParams.get("cancelled") === "1"

  useEffect(() => {
    Promise.all([
      fetch("/api/plans/current").then(r => r.ok ? r.json() : null),
      fetch("/api/settings/billing").then(r => r.ok ? r.json() : null),
    ]).then(([p, b]) => {
      setPlan(p)
      setBilling(b)
      setLoading(false)
    })
  }, [])

  async function upgrade(targetPlan: string) {
    setUpgrading(targetPlan)
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: targetPlan }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      setUpgrading(null)
    }
  }

  async function openPortal() {
    setOpeningPortal(true)
    const res = await fetch("/api/stripe/portal", { method: "POST" })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      setOpeningPortal(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Laddar…</div>
  if (!plan)   return null

  const currentPlanIdx = ALL_PLANS.indexOf(plan.plan)

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Abonnemang & fakturering</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hantera din plan och se användning</p>
      </div>

      {success && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg border border-green-200 dark:border-green-800">
          ✓ Abonnemanget har aktiverats — välkommen!
        </div>
      )}
      {cancelled && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-lg border border-gray-200 dark:border-gray-700">
          Uppgraderingen avbröts.
        </div>
      )}

      {/* Current plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nuvarande plan</CardTitle>
          <span className={`px-3 py-1 text-xs rounded-full font-semibold ${
            plan.plan === "free"
              ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
          }`}>
            {plan.planLabel}
          </span>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Pris</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{plan.planPrice}</span>
          </div>
          {billing?.sub && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{billing.sub.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {billing.sub.cancelAtPeriodEnd ? "Avslutas" : "Förnyas"}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(billing.sub.currentPeriodEnd).toLocaleDateString("sv-SE")}
                </span>
              </div>
            </>
          )}
          {billing?.stripeSubscriptionId && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={openPortal} loading={openingPortal}>
                Hantera abonnemang i Stripe →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader><CardTitle>Användning denna månad</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UsageBar
            label="Fakturor"
            current={plan.usage.invoicesThisMonth}
            max={plan.limits.maxInvoicesPerMonth}
            pct={plan.usagePct.invoicesThisMonth}
          />
          <UsageBar
            label="Kunder"
            current={plan.usage.contacts}
            max={plan.limits.maxContacts}
            pct={plan.usagePct.contacts}
          />
          <UsageBar
            label="Produkter"
            current={plan.usage.products}
            max={plan.limits.maxProducts}
            pct={plan.usagePct.products}
          />
          <UsageBar
            label="Teammedlemmar"
            current={plan.usage.users}
            max={plan.limits.maxUsers}
            pct={plan.usagePct.users}
          />
          <UsageBar
            label="API-nycklar"
            current={plan.usage.apiKeys}
            max={plan.limits.maxApiKeys}
            pct={plan.usagePct.apiKeys}
          />
        </CardContent>
      </Card>

      {/* Feature matrix */}
      <Card>
        <CardHeader><CardTitle>Funktioner per plan</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left pb-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Funktion</th>
                {ALL_PLANS.map(p => (
                  <th key={p} className={`pb-3 px-3 text-center font-semibold ${p === plan.plan ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}>
                    {PLAN_LABELS[p]}
                    {p === plan.plan && <span className="ml-1 text-xs font-normal">(din)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {FEATURE_MATRIX.map(({ key, label }) => (
                <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">{label}</td>
                  {ALL_PLANS.map(p => {
                    const has = PLAN_LIMITS[p].features.includes(key)
                    return (
                      <td key={p} className="py-2.5 px-3 text-center">
                        {has
                          ? <CheckIcon className="mx-auto size-4 text-green-500" />
                          : <span className="text-gray-300 dark:text-gray-600">—</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Upgrade section */}
      {plan.plan !== "enterprise" && (
        <Card>
          <CardHeader><CardTitle>Uppgradera</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ALL_PLANS.filter((p, idx) => idx > currentPlanIdx && p !== "enterprise").map(p => (
              <div key={p} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {PLAN_LABELS[p]}
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">{PLAN_PRICES[p]}</span>
                  </p>
                </div>
                <Button size="sm" loading={upgrading === p} onClick={() => upgrade(p)}>
                  Uppgradera
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Enterprise
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">{PLAN_PRICES.enterprise}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Obegränsat · SLA · SSO · Anpassad integration</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => window.open("mailto:hej@endoo.se")}>
                Kontakta oss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
