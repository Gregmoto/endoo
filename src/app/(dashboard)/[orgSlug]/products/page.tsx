import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { formatMoney } from "@/lib/utils"
import Link from "next/link"

export default async function ProductsPage({ params }: { params: { orgSlug: string } }) {
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const products = await prisma.product.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produkter & tjänster</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} artiklar totalt</p>
        </div>
        <Link
          href={`/${params.orgSlug}/products/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Ny artikel
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm text-gray-400">Inga artiklar ännu.</p>
              <Link
                href={`/${params.orgSlug}/products/new`}
                className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
              >
                Skapa din första artikel
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Namn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Artikelnr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Pris (exkl. moms)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Moms</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Enhet</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600 font-mono text-xs">{p.sku ?? "—"}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{formatMoney(p.unitPrice)}</td>
                    <td className="px-6 py-3 text-gray-600">{p.vatRate}%</td>
                    <td className="px-6 py-3 text-gray-600">{p.unit ?? "st"}</td>
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
