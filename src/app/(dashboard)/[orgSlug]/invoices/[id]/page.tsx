import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStatusBadge } from "@/components/ui/badge"
import { formatMoney, formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const inv = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      contact: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  })
  if (!inv) notFound()

  const balance = Number(inv.totalAmount) - Number(inv.paidAmount)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-4">
        <Link href={`/${orgSlug}/invoices`} className="text-sm text-gray-400 hover:text-gray-600">← Alla fakturor</Link>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{inv.invoiceNumber}</h1>
            <InvoiceStatusBadge status={inv.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">Skapad {formatDate(inv.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {inv.status === "draft" && (
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              Skicka faktura
            </button>
          )}
          {["sent","viewed","partial","overdue"].includes(inv.status) && (
            <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
              Registrera betalning
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle>Faktureringsinfo</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Fakturadatum" value={formatDate(inv.issueDate)} />
            <Row label="Förfallodatum" value={formatDate(inv.dueDate)} />
            <Row label="Valuta" value={inv.currency} />
            {inv.poNumber && <Row label="Er referens" value={inv.poNumber} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mottagare</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {inv.contact ? (
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{inv.contact.name}</p>
                {inv.contact.email && <p className="text-gray-500">{inv.contact.email}</p>}
                {inv.contact.orgNumber && <p className="text-gray-400">Org.nr: {inv.contact.orgNumber}</p>}
              </div>
            ) : (
              <p className="text-gray-400">Ingen kund kopplad</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Beskrivning","Antal","À-pris","Moms","Summa"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.map((l) => (
              <tr key={l.id} className="border-t border-gray-50">
                <td className="px-5 py-3">{l.description}</td>
                <td className="px-5 py-3 text-gray-500">{Number(l.quantity)}</td>
                <td className="px-5 py-3 tabular-nums">{formatMoney(l.unitPrice)}</td>
                <td className="px-5 py-3 text-gray-500">{Math.round(Number(l.taxRate)*100)}%</td>
                <td className="px-5 py-3 font-medium tabular-nums text-right">{formatMoney(l.lineTotal + l.taxAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr><td colSpan={4} className="px-5 py-2 text-right text-sm text-gray-500">Netto</td>
              <td className="px-5 py-2 text-right tabular-nums text-sm">{formatMoney(inv.subtotalAmount)}</td></tr>
            <tr><td colSpan={4} className="px-5 py-2 text-right text-sm text-gray-500">Moms</td>
              <td className="px-5 py-2 text-right tabular-nums text-sm">{formatMoney(inv.taxAmount)}</td></tr>
            <tr className="border-t border-gray-200">
              <td colSpan={4} className="px-5 py-3 text-right font-semibold">Totalt</td>
              <td className="px-5 py-3 text-right font-bold tabular-nums text-base">{formatMoney(inv.totalAmount)}</td>
            </tr>
            {Number(inv.paidAmount) > 0 && (
              <tr><td colSpan={4} className="px-5 py-2 text-right text-sm text-green-600">Betalt</td>
                <td className="px-5 py-2 text-right tabular-nums text-sm text-green-600">-{formatMoney(inv.paidAmount)}</td></tr>
            )}
            {balance > 0 && (
              <tr className="bg-red-50">
                <td colSpan={4} className="px-5 py-2 text-right font-semibold text-red-700">Kvarstår</td>
                <td className="px-5 py-2 text-right font-bold tabular-nums text-red-700">{formatMoney(balance)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </Card>

      {inv.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Betalningar</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50">
                    <td className="px-5 py-3">{formatDate(p.paymentDate)}</td>
                    <td className="px-5 py-3 text-gray-500">{p.method}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-green-600">{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
