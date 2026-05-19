"use client"

import { usePathname } from "next/navigation"
import { NAV_CATEGORIES, type NavCategory, type NavSubItem } from "./config"

export function useActiveCategory(orgSlug: string): {
  activeCategory: NavCategory | null
  activeSubItem: NavSubItem | null
} {
  const pathname = usePathname()
  const base = `/${orgSlug}`

  const localPath = pathname.startsWith(base)
    ? pathname.slice(base.length) || "/"
    : pathname

  for (const cat of NAV_CATEGORIES) {
    if (cat.id === "dashboard") {
      if (localPath === "/" || localPath === "") {
        return { activeCategory: cat, activeSubItem: null }
      }
      continue
    }

    const matched = cat.matchPaths.some(
      (p) => localPath === p || localPath.startsWith(p + "/")
    )
    if (!matched) continue

    let activeSubItem: NavSubItem | null = null
    if (cat.subItems) {
      for (const sub of cat.subItems) {
        const subLocalPath = sub.href(orgSlug).slice(base.length)
        if (localPath === subLocalPath || localPath.startsWith(subLocalPath + "/")) {
          activeSubItem = sub
          break
        }
      }
      if (!activeSubItem && cat.subItems.length > 0) {
        activeSubItem = cat.subItems[0]
      }
    }

    return { activeCategory: cat, activeSubItem }
  }

  return { activeCategory: null, activeSubItem: null }
}
