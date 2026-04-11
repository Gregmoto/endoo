import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

const TYPE_LABELS: Record<string, string> = {
  customer: "Kund",
  agency: "Byrå",
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratis",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
}

export default async function PlatformOrganizationsPage() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: true,
          invoices: { where: { deletedAt: null } },
        },
      },
    },
  })

  const active = orgs.filter((o) => !o.deletedAt).length
  const agencies = orgs.filter((o) => o.type === "agency" && !o.deletedAt).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Organisationer</h1>
        <p className="text-sm text-gray-500 mt-1">
          {active} aktiva · {agencies} byråer
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Totalt" value={orgs.length} />
        <StatCard label="Byråer" value={agencies} />
        <StatCard
          label="Borttagna"
          value={orgs.filter((o) => o.deletedAt).length}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Organisation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Typ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Medlemmar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fakturor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Skapad</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className={`border-t border-gray-50 hover:bg-gray-50 ${org.deletedAt ? "opacity-50" : ""}`}
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/platform/organizations/${org.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {org.name}
                    </Link>
                    <p className="text-xs text-gray-400 font-mono">{org.slug}</p>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={org.type === "agency" ? "default" : "secondary"}>
                      {TYPE_LABELS[org.type] ?? org.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{PLAN_LABELS[org.plan] ?? org.plan}</td>
                  <td className="px-6 py-3 text-gray-600">{org._count.members}</td>
                  <td className="px-6 py-3 text-gray-600">{org._count.invoices}</td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(org.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  )
}
