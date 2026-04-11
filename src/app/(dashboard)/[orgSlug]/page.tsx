import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStatusBadge } from "@/components/ui/badge"
import { formatMoney, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const [invoiceStats, recentInvoices, contactCount] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      where: { organizationId: orgId, deletedAt: null },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { contact: { select: { name: true } } },
    }),
    prisma.contact.count({ where: { organizationId: orgId, deletedAt: null } }),
  ])

  const totalUnpaid = invoiceStats
    .filter((s) => ["sent", "viewed", "partial", "overdue"].includes(s.status))
    .reduce((sum, s) => sum + Number(s._sum.totalAmount ?? 0), 0)

  const totalPaid = invoiceStats
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + Number(s._sum.totalAmount ?? 0), 0)

  const overdueCount = invoiceStats.find((s) => s.status === "overdue")?._count ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Översikt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Välkommen tillbaka, {session?.user?.email?.split("@")[0]}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Utestående" value={formatMoney(totalUnpaid)} sub="att fakturera in" />
        <StatCard label="Betalt (år)" value={formatMoney(totalPaid)} sub="inbetalat" color="green" />
        <StatCard
          label="Förfallna"
          value={String(overdueCount)}
          sub="fakturor"
          color={overdueCount > 0 ? "red" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Senaste fakturor</CardTitle>
              <Link href={`/${orgSlug}/invoices`} className="text-xs text-indigo-600 hover:underline">Visa alla</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentInvoices.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">
                Inga fakturor än.{" "}
                <Link href={`/${orgSlug}/invoices/new`} className="text-indigo-600 hover:underline">Skapa din första</Link>
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link href={`/${orgSlug}/invoices/${inv.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                          {inv.invoiceNumber}
                        </Link>
                        <p className="text-xs text-gray-400">{inv.contact?.name ?? "—"}</p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-3 text-right font-medium tabular-nums">
                        {formatMoney(inv.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Snabbåtgärder</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Skapa ny faktura",   href: `/${orgSlug}/invoices/new`, desc: "Fakturera en kund" },
              { label: "Lägg till kontakt",  href: `/${orgSlug}/contacts`,     desc: `${contactCount} kontakter totalt` },
              { label: "Bjud in teammedlem", href: `/${orgSlug}/team`,         desc: "Hantera ditt team" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group">
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">{a.label}</p>
                  <p className="text-xs text-gray-400">{a.desc}</p>
                </div>
                <span className="text-gray-300 group-hover:text-indigo-500">→</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color?: "green" | "red"
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 tabular-nums ${
          color === "green" ? "text-green-600" :
          color === "red"   ? "text-red-600" :
          "text-gray-900"
        }`}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}
