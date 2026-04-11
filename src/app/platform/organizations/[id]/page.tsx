import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InvoiceStatusBadge } from "@/components/ui/badge"
import { formatDate, formatMoney, initials, stringToColor } from "@/lib/utils"
import Link from "next/link"

export default async function PlatformOrgDetailPage({ params }: { params: { id: string } }) {
  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { name: true, email: true, isPlatformAdmin: true } } },
        orderBy: { createdAt: "asc" },
      },
      invoices: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { contact: { select: { name: true } } },
      },
      _count: {
        select: {
          invoices: { where: { deletedAt: null } },
          contacts: { where: { deletedAt: null } },
          members: true,
        },
      },
    },
  })

  if (!org) notFound()

  const ROLE_LABELS: Record<string, string> = {
    owner: "Ägare",
    admin: "Admin",
    member: "Medlem",
    viewer: "Läsare",
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/platform/organizations" className="text-sm text-gray-400 hover:text-gray-600">
          ← Alla organisationer
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: stringToColor(org.name) }}
          >
            {initials(org.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{org.slug}</p>
          </div>
          {org.deletedAt && (
            <Badge variant="danger">Borttagen</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Fakturor" value={org._count.invoices} />
        <StatCard label="Kontakter" value={org._count.contacts} />
        <StatCard label="Medlemmar" value={org._count.members} />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan</p>
            <p className="text-lg font-bold text-gray-900 capitalize">{org.plan}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle>Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Typ" value={org.type === "agency" ? "Byrå" : "Kund"} />
            <Row label="Org.nr" value={org.orgNumber} />
            <Row label="Momsnr" value={org.vatNumber} />
            <Row label="Skapad" value={formatDate(org.createdAt)} />
            {org.subscriptionStatus && (
              <Row label="Prenumerationsstatus" value={org.subscriptionStatus} />
            )}
            {org.subscriptionPeriodEnd && (
              <Row label="Perioden slutar" value={formatDate(org.subscriptionPeriodEnd)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Teammedlemmar</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {org.members.map((m) => (
                  <tr key={m.id} className="border-t border-gray-50 first:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{m.user.name ?? m.user.email}</p>
                      {m.user.name && <p className="text-xs text-gray-400">{m.user.email}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Senaste fakturor</CardTitle>
          <span className="text-sm text-gray-400">{org._count.invoices} totalt</span>
        </CardHeader>
        <CardContent className="p-0">
          {org.invoices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Inga fakturor.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kund</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Belopp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Datum</th>
                </tr>
              </thead>
              <tbody>
                {org.invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700">{inv.invoiceNumber}</td>
                    <td className="px-6 py-3 text-gray-700">{inv.contact?.name ?? "—"}</td>
                    <td className="px-6 py-3 font-medium">{formatMoney(inv.totalAmount)}</td>
                    <td className="px-6 py-3"><InvoiceStatusBadge status={inv.status as any} /></td>
                    <td className="px-6 py-3 text-gray-400">{formatDate(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{value ?? "—"}</span>
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
