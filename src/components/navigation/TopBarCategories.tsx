"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { NavCategory } from "@/lib/navigation/config"
import { useActiveCategory } from "@/lib/navigation/use-active-category"

interface Props {
  orgSlug: string
  categories: NavCategory[]
}

const MORE_BTN_WIDTH = 76

export function TopBarCategories({ orgSlug, categories }: Props) {
  const { activeCategory } = useActiveCategory(orgSlug)
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(categories.length)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const compute = () => {
      const available = container.clientWidth
      const items = Array.from(measure.children) as HTMLElement[]
      let total = 0
      let count = 0
      for (let i = 0; i < items.length; i++) {
        const w = items[i].offsetWidth
        const needsMore = i < items.length - 1
        if (total + w + (needsMore ? MORE_BTN_WIDTH : 0) > available) break
        total += w
        count++
      }
      setVisibleCount(count > 0 ? count : categories.length)
    }

    const ro = new ResizeObserver(compute)
    ro.observe(container)
    compute()
    return () => ro.disconnect()
  }, [categories.length])

  const overflowCats = visibleCount >= categories.length ? [] : categories.slice(visibleCount)

  return (
    <div ref={containerRef} className="relative flex items-stretch h-full overflow-hidden">
      {/* Measurement layer — invisible but in layout for width queries */}
      <div ref={measureRef} className="absolute invisible flex pointer-events-none" aria-hidden="true">
        {categories.map((cat) => (
          <span key={cat.id} className="flex items-center px-4 text-sm font-medium whitespace-nowrap">
            {cat.label}
          </span>
        ))}
      </div>

      {/* Visible categories */}
      {categories.slice(0, visibleCount).map((cat) => {
        const isActive = activeCategory?.id === cat.id
        return (
          <Link
            key={cat.id}
            href={cat.href(orgSlug)}
            className={cn(
              "flex items-center px-4 h-full text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
              isActive
                ? "border-primary text-foreground font-semibold bg-accent/30"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {cat.label}
          </Link>
        )
      })}

      {/* Overflow "Mer ▾" */}
      {overflowCats.length > 0 && (
        <div className="relative flex items-center flex-shrink-0">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="flex items-center gap-1 px-3 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 whitespace-nowrap transition-colors"
          >
            Mer <span className="text-[10px]">{moreOpen ? "▲" : "▼"}</span>
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div className="absolute left-0 top-[calc(100%+2px)] bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                {overflowCats.map((cat) => (
                  <Link
                    key={cat.id}
                    href={cat.href(orgSlug)}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-accent",
                      activeCategory?.id === cat.id
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
