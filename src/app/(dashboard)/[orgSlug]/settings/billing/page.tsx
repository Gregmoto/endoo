"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type BillingData = {
  plan: string
  stripeSubscriptionId: string | null
  sub: { status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null
  usage: { invoices: number; contacts: number; members: number }
  limits: { maxInvoicesPerMonth: number; maxContacts: number; maxUsers: number }
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "299 kr/mån",
    features: ["3 användare", "100 kontakter", "50 fakturor/mån", "E-post & PDF"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "799 kr/mån",
    features: ["10 användare", "1 000 kontakter", "500 fakturor/mån", "Avtalsfakturering", "Prioriterad support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Kontakta oss",
    features: ["Obegränsat", "SLA", "Dedikerad support", "SSO", "Anpassad integration"],
  },
]

const PLAN_LABELS: Record<string, string> = { free: "Gratis", starter: "Starter", pro: "Pro", enterprise: "Enterprise" }

export default function BillingPage() {
  const params       = useParams<{ orgSlug: string }>()
  const searchParams = useSearchParams()
  const [data, setData]       = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)
  const success   = searchParams.get("success")   === "1"
  const cancelled = searchParams.get("cancelled") === "1"

  useEffect(() => {
    fetch("/api/settings/billing")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
  }, [])

  async function upgrade(plan: string) {
    setUpgrading(plan)
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
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
  if (!data)   return null

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonnemang & fakturering</h1>
        <p className="text-sm text-gray-500 mt-1">Hantera ditt abonnemang och se användning</p>
      </div>

      {success && (
        <div className="mb-6 px-4 py-3 bg-green-50 text-green-700 text-sm rounded-lg">
          ✓ Abonnemanget har aktiverats — välkommen!
        </div>
      )}
      {cancelled && (
        <div className="mb-6 px-4 py-3 bg-gray-50 text-gray-600 text-sm rounded-lg">
          Uppgraderingen avbröts.
        </div>
      )}

      {/* Current plan */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nuvarande plan</CardTitle>
          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
            data.plan === "free" ? "bg-gray-100 text-gray-600" : "bg-indigo-100 text-indigo-700"
          }`}>
            {PLAN_LABELS[data.plan] ?? data.plan}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.sub && (
            <>
              <Row label="Status" value={data.sub.status} />
              <Row
                label={data.sub.cancelAtPeriodEnd ? "Avslutas" : "Förnyas"}
                value={new Date(data.sub.currentPeriodEnd).toLocaleDateString("sv-SE")}
              />
            </>
          )}
          {data.stripeSubscriptionId && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={openPortal} loading={openingPortal}>
                Hantera abonnemang i Stripe →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Användning</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="Fakturor" used={data.usage.invoices} limit={data.limits.maxInvoicesPerMonth} />
          <UsageBar label="Kontakter" used={data.usage.contacts} limit={data.limits.maxContacts} />
          <UsageBar label="Teammedlemmar" used={data.usage.members} limit={data.limits.maxUsers} />
        </CardContent>
      </Card>

      {/* Upgrade plans */}
      {data.plan === "free" && (
        <Card>
          <CardHeader><CardTitle>Uppgradera</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {PLANS.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">{p.name} <span className="ml-2 text-sm font-normal text-gray-500">{p.price}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.features.join(" · ")}</p>
                </div>
                {p.id === "enterprise" ? (
                  <Button size="sm" variant="outline" onClick={() => window.open("mailto:hej@endoo.se")}>
                    Kontakta oss
                  </Button>
                ) : (
                  <Button size="sm" loading={upgrading === p.id} onClick={() => upgrade(p.id)}>
                    Uppgradera
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 capitalize">{value}</span>
    </div>
  )
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited  = limit >= 9999
  const pct        = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const nearLimit  = pct >= 80
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-700">{label}</span>
        <span className={`font-medium ${nearLimit && !unlimited ? "text-amber-600" : "text-gray-900"}`}>
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${nearLimit ? "bg-amber-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
