"use client"

import { useEffect, useState } from "react"
import { APP_VERSION } from "@/lib/version"

interface VersionEntry {
  version: string
  releasedAt: string
  categories: Record<string, string[]>
}

interface WhatsNewModalProps {
  userLastSeenVersion: string | null
  userId: string
}

export function WhatsNewModal({ userLastSeenVersion, userId }: WhatsNewModalProps) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<VersionEntry[]>([])

  useEffect(() => {
    if (!userLastSeenVersion || userLastSeenVersion === APP_VERSION) return

    fetch("/api/changelog")
      .then((r) => r.ok ? r.json() : { versions: [] })
      .then(({ versions }: { versions: VersionEntry[] }) => {
        // Collect entries newer than lastSeen
        const newer = versions.filter((v) => {
          if (v.version === userLastSeenVersion) return false
          return compareVersions(v.version, userLastSeenVersion) > 0
        })
        const relevant = newer.filter(
          (v) => v.categories["Added"] || v.categories["Changed"]
        )
        if (relevant.length > 0) {
          setEntries(relevant)
          setOpen(true)
        }
      })
      .catch(() => {})
  }, [userLastSeenVersion])

  async function dismiss() {
    setOpen(false)
    await fetch("/api/settings/seen-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: APP_VERSION, userId }),
    }).catch(() => {})
  }

  if (!open || entries.length === 0) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={dismiss}
      />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5">
          <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">
            Vad är nytt
          </p>
          <h2 className="text-xl font-bold text-white">
            Endoo v{APP_VERSION}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-96 overflow-y-auto space-y-5">
          {entries.map((v) => (
            <div key={v.version}>
              <p className="text-xs font-mono font-semibold text-gray-400 dark:text-gray-500 mb-2">
                v{v.version} · {v.releasedAt}
              </p>
              {["Added", "Changed"].map((cat) =>
                v.categories[cat]?.length ? (
                  <div key={cat} className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                      {cat === "Added" ? "Nytt" : "Ändrat"}
                    </p>
                    <ul className="space-y-1.5">
                      {v.categories[cat].map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-indigo-500 flex-shrink-0 mt-0.5">
                            {cat === "Added" ? "+" : "~"}
                          </span>
                          <span>{item.replace(/^\*\*\[.*?\]\*\*\s*/, "")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <a
            href="/version"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Visa fullständig changelog
          </a>
          <button
            onClick={dismiss}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Förstått
          </button>
        </div>
      </div>
    </div>
  )
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1
  }
  return 0
}
