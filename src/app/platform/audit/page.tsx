import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import type { AuditAction } from "@prisma/client"

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>
}) {
  const { page: pageParam, action } = await searchParams
  const page = parseInt(pageParam ?? "1")
  const pageSize = 50

  // action is an enum — filter only if value matches a valid enum value
  const validActions: AuditAction[] = [
    "create","update","delete","login","logout",
    "impersonate_start","impersonate_end","invite_send","invite_accept",
    "plan_change","payment_record","invoice_send","invoice_void","account_switch",
  ]
  const matchedAction = validActions.find(a => a === action) ?? null
  const where = matchedAction ? { action: matchedAction } : {}

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        user: { select: { fullName: true, email: true } },
        organization: { select: { name: true, slug: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plattformslogg</h1>
          <p className="text-sm text-muted-foreground mt-1">{total.toLocaleString("sv-SE")} händelser totalt</p>
        </div>
        <form className="flex gap-2">
          <select
            name="action"
            defaultValue={action ?? ""}
            className="px-3 py-2 text-sm border border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Alla händelser</option>
            {validActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-accent transition-colors"
          >
            Filtrera
          </button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Tidpunkt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Användare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Organisation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Händelse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Resurs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border/50 hover:bg-muted">
                  <td className="px-6 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {new Intl.DateTimeFormat("sv-SE", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    }).format(new Date(log.createdAt))}
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-foreground">{log.user?.fullName ?? log.user?.email ?? "System"}</p>
                    {log.user?.fullName && (
                      <p className="text-xs text-muted-foreground">{log.user.email}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground text-xs">
                    {log.organization?.name ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    <code className="text-xs bg-muted text-foreground px-1.5 py-0.5 rounded">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground text-xs">
                    {log.entityType}
                    {log.entityId && (
                      <span className="text-muted-foreground font-mono ml-1">#{log.entityId.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Inga händelser hittades.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Sida {page} av {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${action ? `&action=${action}` : ""}`}
                className="px-3 py-1.5 border border rounded-lg hover:bg-muted"
              >
                Föregående
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${action ? `&action=${action}` : ""}`}
                className="px-3 py-1.5 border border rounded-lg hover:bg-muted"
              >
                Nästa
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
