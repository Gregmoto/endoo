import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatMoney } from "@/lib/utils"
import Link from "next/link"

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bankgiro",
  card: "Kort",
  swish: "Swish",
  cash: "Kontant",
  other: "Annat",
}

export default async function PaymentsPage({ params }: { params: { orgSlug: string } }) {
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const payments = await prisma.payment.findMany({
    where: { organizationId: orgId },
    orderBy: { paidAt: "desc" },
    take: 100,
    include: {
      invoice: {
        select: { invoiceNumber: true, id: true, contact: { select: { name: true } } },
      },
    },
  })

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Betalningar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {payments.length} betalningar · {formatMoney(total)} totalt
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-sm text-gray-400">Inga registrerade betalningar ännu.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Faktura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kund</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Metod</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Belopp</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600">{formatDate(p.paidAt)}</td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/${params.orgSlug}/invoices/${p.invoice.id}`}
                        className="font-mono text-indigo-600 hover:underline text-xs"
                      >
                        {p.invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{p.invoice.contact?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-6 py-3 text-right font-medium text-green-700">{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-700">Totalt</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">{formatMoney(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
