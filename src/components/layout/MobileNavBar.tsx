"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { QuickCreateSheet } from "@/components/layout/QuickCreateSheet"

interface MobileNavBarProps {
  orgSlug: string
}

type Tab = {
  label:   string
  href?:   string
  icon:    string
  action?: "quick-create"
}

const TABS: Tab[] = [
  { label: "Start",     href: "",          icon: "▦" },
  { label: "Fakturor",  href: "/invoices", icon: "◧" },
  { label: "Nytt",                         icon: "＋", action: "quick-create" },
  { label: "Kunder",    href: "/contacts", icon: "◈" },
  { label: "Meny",      href: "/settings", icon: "◌" },
]

export function MobileNavBar({ orgSlug }: MobileNavBarProps) {
  const pathname          = usePathname()
  const base              = `/${orgSlug}`
  const [sheetOpen, setSheetOpen] = useState(false)

  function isActive(href: string) {
    const full = `${base}${href}`
    if (href === "") return pathname === base
    return pathname.startsWith(full)
  }

  return (
    <>
      <QuickCreateSheet open={sheetOpen} onClose={() => setSheetOpen(false)} orgSlug={orgSlug} />

      {/* Bottom tab bar — only on mobile */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-14">
          {TABS.map((tab) => {
            if (tab.action === "quick-create") {
              return (
                <button
                  key="quick-create"
                  onClick={() => setSheetOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5"
                  aria-label="Skapa nytt"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-light shadow-md shadow-brand-200 -mt-3">
                    ＋
                  </div>
                </button>
              )
            }

            const active = isActive(tab.href!)
            return (
              <Link
                key={tab.href}
                href={`${base}${tab.href}`}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                  active ? "text-brand-600" : "text-gray-400"
                )}
              >
                <span className={cn("text-xl leading-none", active && "text-brand-600")}>
                  {tab.icon}
                </span>
                <span className="leading-none">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
