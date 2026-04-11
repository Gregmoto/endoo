import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { InvoiceStatusBadge } from "@/components/ui/badge"
import { formatMoney, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function InvoicesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { contact: { select: { name: true } } },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fakturor</h1>
          <p className="text-sm text-gray-500 mt-1">{invoices.length} fakturor totalt</p>
        </div>
        <Link href={`/${orgSlug}/invoices/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          + Ny faktura
        </Link>
      </div>

      <Card>
        {invoices.length === 0 ? (
          <CardContent className="py-16 text-center">
            <p className="text-4xl mb-3">◧</p>
            <p className="font-medium text-gray-900">Inga fakturor än</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Skapa din första faktura</p>
            <Link href={`/${orgSlug}/invoices/new`}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              Skapa faktura
            </Link>
          </CardContent>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Fakturanr","Kund","Datum","Förfaller","Belopp","Status",""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3 text-gray-600">{inv.contact?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(inv.issueDate)}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3 font-medium tabular-nums">{formatMoney(inv.totalAmount)}</td>
                  <td className="px-5 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/${orgSlug}/invoices/${inv.id}`} className="text-indigo-600 hover:underline text-xs font-medium">Öppna</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
