import { getVersionInfo } from "@/lib/version"

export const metadata = { title: "Version · Endoo" }

interface VersionEntry {
  version: string
  releasedAt: string
  isCurrent: boolean
  categories: Record<string, string[]>
}

async function fetchChangelog(): Promise<VersionEntry[]> {
  try {
    const base =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
    const res = await fetch(`${base}/api/changelog`, { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    return data.versions ?? []
  } catch {
    return []
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  Added:    "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  Changed:  "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  Fixed:    "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400",
  Removed:  "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  Security: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400",
  Database: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  Breaking: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  Deprecated:"bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
}

export default async function VersionPage() {
  const info = getVersionInfo()
  const versions = await fetchChangelog()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-bold font-mono text-gray-900 dark:text-gray-100">
              v{info.version}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              current
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Endoo — ekonomiplattform för byråer och företag
          </p>
        </div>

        {/* Build info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {[
            ["Version",         info.version],
            ["Releasedatum",    info.releasedAt],
            ["Commit",          info.commit],
            ["Branch",          info.branch],
            ["Miljö",           info.environment],
            ["Databasschema",   info.databaseSchemaVersion],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
              <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{value}</span>
            </div>
          ))}
        </div>

        {/* Changelog */}
        {versions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Changelog
            </h2>
            <div className="space-y-6">
              {versions.slice(0, 10).map((v) => (
                <div key={v.version} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      v{v.version}
                    </span>
                    {v.isCurrent && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        current
                      </span>
                    )}
                    {v.releasedAt && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                        {v.releasedAt}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {Object.entries(v.categories).map(([cat, items]) => (
                      <div key={cat}>
                        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-2 ${CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}>
                          {cat}
                        </span>
                        <ul className="space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                              <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">–</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer link */}
        <div className="text-center">
          <a
            href="https://github.com/Gregmoto/endoo/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Visa full CHANGELOG.md på GitHub →
          </a>
        </div>
      </div>
    </div>
  )
}
