import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"

export default async function AuditPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  await params
  const session = await auth()
  const orgId = session?.activeOrganizationId ?? ""

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { fullName: true, email: true } },
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Aktivitetslogg</h1>
        <p className="text-sm text-muted-foreground mt-1">Senaste {logs.length} händelserna i organisationen</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">Ingen aktivitet loggad ännu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Tidpunkt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Användare</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Händelse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Resurs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border/50 hover:bg-muted">
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.createdAt))}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-foreground">{log.user?.fullName ?? log.user?.email ?? "System"}</p>
                      {log.user?.fullName && <p className="text-xs text-muted-foreground">{log.user.email}</p>}
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-xs bg-muted text-foreground px-1.5 py-0.5 rounded">{log.action}</code>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">
                      {log.entityType && <span>{log.entityType}</span>}
                      {log.entityId && <span className="text-muted-foreground font-mono ml-1">#{log.entityId.slice(0, 8)}</span>}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{log.ipAddress ?? "—"}</td>
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
