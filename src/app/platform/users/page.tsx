import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

export default async function PlatformUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        include: { organization: { select: { name: true, slug: true } } },
      },
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Användare</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} registrerade användare</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Användare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Organisationer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Roll</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Registrerad</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{user.fullName ?? user.email}</p>
                    {user.fullName && <p className="text-xs text-gray-400">{user.email}</p>}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.memberships.map((m) => (
                        <span
                          key={m.id}
                          className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {m.organization.name}
                        </span>
                      ))}
                      {user.memberships.length === 0 && (
                        <span className="text-gray-400 text-xs">Ingen organisation</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {user.isPlatformAdmin ? (
                      <Badge variant="danger">Super Admin</Badge>
                    ) : (
                      <Badge variant="secondary">Användare</Badge>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
