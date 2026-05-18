import { requireSuperAdmin } from "@/lib/rbac/guards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import fs from "fs"
import path from "path"

interface RouteEntry {
  path:               string
  file:               string
  methods:            string[]
  category:           string
  hasDynamicSegments: boolean
  requiresAuth:       boolean
}

interface RouteManifest {
  generated:   string
  totalRoutes: number
  byCategory:  Record<string, number>
  routes:      RouteEntry[]
}

interface AuditFinding {
  file:    string
  line:    number
  model:   string
  method:  string
  snippet: string
}

interface AuditReport {
  generated:        string
  totalSuspects:    number
  totalWhitelisted: number
  suspects:         AuditFinding[]
}

function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T
  } catch {
    return fallback
  }
}

export default async function SecurityAuditReportPage() {
  await requireSuperAdmin()

  const manifestPath = path.resolve("tests/_route-manifest.json")
  const auditPath    = path.resolve("tests/_audit-prisma-report.json")

  const manifest = loadJSON<RouteManifest>(manifestPath, {
    generated: "not generated yet", totalRoutes: 0, byCategory: {}, routes: [],
  })

  const audit = loadJSON<AuditReport>(auditPath, {
    generated: "not generated yet", totalSuspects: -1, totalWhitelisted: 0, suspects: [],
  })

  const categoryColors: Record<string, string> = {
    tenant:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    platform: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    portal:   "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    v1:       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    cron:     "bg-muted text-muted-foreground",
    public:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Security Audit Report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tenant isolation coverage and Prisma query audit. Run{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            npm run scan-routes
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            npm run audit:prisma
          </code>{" "}
          to refresh.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{manifest.totalRoutes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tenant-Scoped</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {manifest.byCategory.tenant ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspect Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${
              audit.totalSuspects === 0
                ? "text-green-600 dark:text-green-400"
                : audit.totalSuspects < 0
                  ? "text-gray-400"
                  : "text-red-600 dark:text-red-400"
            }`}>
              {audit.totalSuspects < 0 ? "—" : audit.totalSuspects}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audit Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
              audit.totalSuspects === 0
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : audit.totalSuspects < 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            }`}>
              {audit.totalSuspects === 0 ? "✅ Clean" : audit.totalSuspects < 0 ? "Not run" : "⚠️ Review needed"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Suspect queries */}
      {audit.suspects.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">
              ⚠️ Suspect Prisma Queries ({audit.suspects.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These calls on tenant-scoped models may be missing an{" "}
              <code className="text-xs">organizationId</code> filter.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">File</th>
                    <th className="pb-2 pr-4">Line</th>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.suspects.map((s, i) => (
                    <tr key={i} className="border-b border">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">
                        {s.file}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.line}</td>
                      <td className="py-2 pr-4">
                        <code className="text-xs">{s.model}</code>
                      </td>
                      <td className="py-2">
                        <code className="text-xs">{s.method}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route manifest */}
      <Card>
        <CardHeader>
          <CardTitle>Route Manifest</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generated: {manifest.generated}
          </p>
        </CardHeader>
        <CardContent>
          {/* Category breakdown */}
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(manifest.byCategory).map(([cat, count]) => (
              <span
                key={cat}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryColors[cat] ?? "bg-muted text-muted-foreground"}`}
              >
                {cat}: {count}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="pb-2 pr-4">Path</th>
                  <th className="pb-2 pr-4">Methods</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2">Auth</th>
                </tr>
              </thead>
              <tbody>
                {manifest.routes.map((r, i) => (
                  <tr key={i} className="border-b border hover:bg-muted">
                    <td className="py-1.5 pr-4 font-mono text-xs text-foreground">
                      {r.path}
                    </td>
                    <td className="py-1.5 pr-4">
                      <div className="flex gap-1">
                        {r.methods.map(m => (
                          <span key={m} className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-1.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[r.category] ?? "bg-muted text-muted-foreground"}`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="py-1.5">
                      {r.requiresAuth
                        ? <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Manifest: {manifestPath} · Audit: {auditPath}
      </p>
    </div>
  )
}
