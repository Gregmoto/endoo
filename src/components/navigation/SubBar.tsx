"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { NavSubItem } from "@/lib/navigation/config"
import { useActiveCategory } from "@/lib/navigation/use-active-category"

interface Props {
  orgSlug: string
  subItems: NavSubItem[]
}

export function SubBar({ orgSlug, subItems }: Props) {
  const { activeSubItem } = useActiveCategory(orgSlug)

  return (
    <div className="h-11 flex items-stretch bg-muted/30 border-b border-border px-2 overflow-x-auto">
      {subItems.map((item) => {
        const isActive = activeSubItem?.id === item.id
        return (
          <Link
            key={item.id}
            href={item.href(orgSlug)}
            className={cn(
              "flex items-center px-4 h-full text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0",
              isActive
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
