import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PLANS } from "@/lib/constants"

const PLAN_LABELS: Record<string, string> = {
  free: "Gratis",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
}

export default async function BillingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  await params
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const [org, sub, memberCount, invoiceCount, contactCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, stripeSubscriptionId: true },
    }),
    prisma.subscription.findUnique({
      where: { organizationId: orgId },
      select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
    prisma.organizationMember.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.invoice.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.contact.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
  ])

  if (!org) return null

  const plan = PLANS[org.plan as keyof typeof PLANS] ?? PLANS.free
  const maxInvoices = "maxInvoicesPerMonth" in plan ? (plan.maxInvoicesPerMonth === Infinity ? -1 : plan.maxInvoicesPerMonth) : -1
  const maxContacts = "maxClients" in plan ? (plan.maxClients === Infinity ? -1 : plan.maxClients) : -1
  const maxMembers = "maxUsers" in plan ? (plan.maxUsers === Infinity ? -1 : plan.maxUsers) : -1

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonnemang & fakturering</h1>
        <p className="text-sm text-gray-500 mt-1">Hantera ditt abonnemang och se användning</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nuvarande plan</CardTitle>
          <Badge variant={org.plan === "free" ? "secondary" : "default"}>
            {PLAN_LABELS[org.plan] ?? org.plan}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {sub?.status && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-medium capitalize">{sub.status}</span>
            </div>
          )}
          {sub?.currentPeriodEnd && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{sub.cancelAtPeriodEnd ? "Avslutas" : "Förnyas"}</span>
              <span className="font-medium">
                {new Intl.DateTimeFormat("sv-SE", { dateStyle: "short" }).format(new Date(sub.currentPeriodEnd))}
              </span>
            </div>
          )}
          {org.plan === "free" && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-800 font-medium mb-1">Uppgradera för mer</p>
              <p className="text-sm text-indigo-600">Få fler fakturor, kontakter och teammedlemmar med Starter eller Pro.</p>
              <button className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Se planer
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Användning denna period</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="Fakturor (denna månad)" used={invoiceCount} limit={maxInvoices} />
          <UsageBar label="Kontakter" used={contactCount} limit={maxContacts} />
          <UsageBar label="Teammedlemmar" used={memberCount} limit={maxMembers} />
        </CardContent>
      </Card>

      {org.stripeSubscriptionId && (
        <Card>
          <CardHeader><CardTitle>Hantera abonnemang</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Ändra plan, uppdatera betalningsmetod eller avsluta ditt abonnemang via Stripe-portalen.
            </p>
            <button className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Öppna faktureringsportal
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const isNearLimit = pct >= 80
  const isUnlimited = limit === -1
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-700">{label}</span>
        <span className={`font-medium ${isNearLimit && !isUnlimited ? "text-amber-600" : "text-gray-900"}`}>
          {used} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isNearLimit ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
