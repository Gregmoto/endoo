import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

export default async function AuditPage({ params }: { params: { orgSlug: string } }) {
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { name: true, email: true } },
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Aktivitetslogg</h1>
        <p className="text-sm text-gray-500 mt-1">Senaste {logs.length} händelserna i organisationen</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-gray-400">Ingen aktivitet loggad ännu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tidpunkt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Användare</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Händelse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Resurs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Intl.DateTimeFormat("sv-SE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(log.createdAt))}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-gray-900">{log.actor?.name ?? log.actor?.email ?? "System"}</p>
                      {log.actor?.name && (
                        <p className="text-xs text-gray-400">{log.actor.email}</p>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {log.action}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {log.resourceType && (
                        <span>{log.resourceType}</span>
                      )}
                      {log.resourceId && (
                        <span className="text-gray-400 font-mono ml-1">#{log.resourceId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">{log.ipAddress ?? "—"}</td>
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
