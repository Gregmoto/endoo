"use client"

import Link from "next/link"
import { APP_VERSION, APP_BUILD_COMMIT, APP_VERSION_DATE } from "@/lib/version"

export function VersionBadge() {
  return (
    <Link
      href="/version"
      title={`${APP_VERSION} · ${APP_BUILD_COMMIT} · ${APP_VERSION_DATE}`}
      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
      v{APP_VERSION}
    </Link>
  )
}
