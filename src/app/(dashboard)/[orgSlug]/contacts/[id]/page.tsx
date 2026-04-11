import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStatusBadge } from "@/components/ui/badge"
import { formatDate, formatMoney } from "@/lib/utils"
import Link from "next/link"

export default async function ContactDetailPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      invoices: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })
  if (!contact) notFound()

  const totalBilled = contact.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
  const totalPaid = contact.invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href={`/${orgSlug}/contacts`} className="text-sm text-gray-400 hover:text-gray-600">← Alla kontakter</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{contact.name}</h1>
        {contact.orgNumber && <p className="text-sm text-gray-500 font-mono">{contact.orgNumber}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fakturerat</p>
          <p className="text-xl font-bold text-gray-900">{formatMoney(totalBilled)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Betalt</p>
          <p className="text-xl font-bold text-green-600">{formatMoney(totalPaid)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Utestående</p>
          <p className="text-xl font-bold text-amber-600">{formatMoney(totalBilled - totalPaid)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle>Kontaktuppgifter</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="E-post" value={contact.email} />
            <Row label="Telefon" value={contact.phone} />
            <Row label="Webbplats" value={contact.website} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Adress</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Gatuadress" value={contact.addressLine1} />
            <Row label="Postnummer" value={contact.postalCode} />
            <Row label="Stad" value={contact.city} />
            <Row label="Land" value={contact.country} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fakturor</CardTitle>
          <Link href={`/${orgSlug}/invoices/new?contactId=${contact.id}`} className="text-sm text-indigo-600 hover:underline">
            + Ny faktura
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {contact.invoices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Inga fakturor ännu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Förfallodatum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Belopp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {contact.invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link href={`/${orgSlug}/invoices/${inv.id}`} className="font-mono text-indigo-600 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-3 font-medium">{formatMoney(inv.totalAmount)}</td>
                    <td className="px-6 py-3"><InvoiceStatusBadge status={inv.status as any} /></td>
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
