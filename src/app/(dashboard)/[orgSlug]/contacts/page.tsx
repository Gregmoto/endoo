import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

export default async function ContactsPage({ params }: { params: { orgSlug: string } }) {
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { invoices: { where: { deletedAt: null } } } },
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontakter</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} kontakter totalt</p>
        </div>
        <Link
          href={`/${params.orgSlug}/contacts/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Ny kontakt
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-400">Inga kontakter ännu.</p>
              <Link
                href={`/${params.orgSlug}/contacts/new`}
                className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
              >
                Lägg till din första kontakt
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Namn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">E-post</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Org.nr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fakturor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Skapad</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/${params.orgSlug}/contacts/${c.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {c.name}
                      </Link>
                      {c.city && <p className="text-xs text-gray-400">{c.city}</p>}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{c.email ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600 font-mono text-xs">{c.orgNumber ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{c._count.invoices}</td>
                    <td className="px-6 py-3 text-gray-400">{formatDate(c.createdAt)}</td>
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
