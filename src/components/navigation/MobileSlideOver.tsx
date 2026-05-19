"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn, initials } from "@/lib/utils"
import { useTheme } from "next-themes"
import { signOut } from "next-auth/react"
import type { NavCategory } from "@/lib/navigation/config"
import { OrgSwitcher } from "./OrgSwitcher"
import { FiscalYearSwitcher } from "./FiscalYearSwitcher"

interface Props {
  open: boolean
  onClose: () => void
  orgSlug: string
  orgName: string
  orgId: string
  userEmail: string
  userName?: string | null
  categories: NavCategory[]
}

export function MobileSlideOver({
  open,
  onClose,
  orgSlug,
  orgName,
  orgId,
  userEmail,
  userName,
  categories,
}: Props) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Close on navigation
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const base = `/${orgSlug}`

  function isActive(cat: NavCategory) {
    if (cat.matchPaths.length === 0) return pathname === base
    return cat.matchPaths.some((p) => pathname.startsWith(`${base}${p}`))
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <aside className="fixed inset-y-0 left-0 z-[70] flex flex-col bg-background shadow-2xl w-[85vw] max-w-xs animate-drawer-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="font-bold text-base text-primary">Endoo</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Stäng meny"
          >
            ✕
          </button>
        </div>

        {/* Org + year switchers */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <OrgSwitcher orgSlug={orgSlug} orgName={orgName} className="flex-1 min-w-0" />
          <FiscalYearSwitcher orgId={orgId} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {categories.map((cat) => {
            const active = isActive(cat)
            const hasSubItems = !!cat.subItems?.length
            const isExpanded = expanded === cat.id

            return (
              <div key={cat.id}>
                {hasSubItems ? (
                  <>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : cat.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? "text-foreground bg-accent/30"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      {cat.label}
                      <span className="text-[10px] ml-2">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                    {isExpanded && cat.subItems && (
                      <div className="border-l-2 border-primary/30 ml-5">
                        {cat.subItems.map((sub) => (
                          <Link
                            key={sub.id}
                            href={sub.href(orgSlug)}
                            onClick={onClose}
                            className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={cat.href(orgSlug)}
                    onClick={onClose}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "text-foreground bg-accent/30 font-semibold"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </Link>
                )}
              </div>
            )
          })}

          {/* Utility links */}
          <div className="mt-2 border-t border-border pt-2">
            {[
              { href: "/tasks",    label: "Uppgifter",     icon: "☑" },
              { href: "/team",     label: "Team",          icon: "◫" },
              { href: "/settings", label: "Inställningar", icon: "⚙" },
              { href: "/audit",    label: "Audit log",     icon: "◷" },
            ].map((item) => (
              <Link
                key={item.href}
                href={`${base}${item.href}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <span className="text-base leading-none w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 space-y-3 flex-shrink-0">
          {/* Theme toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tema</span>
            <div className="flex gap-1 ml-auto">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md transition-colors",
                    theme === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {t === "light" ? "Ljust" : t === "dark" ? "Mörkt" : "Auto"}
                </button>
              ))}
            </div>
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials(userName || userEmail, 2)}
            </div>
            <span className="text-xs text-muted-foreground truncate flex-1">{userEmail}</span>
            <button
              onClick={async () => {
                setSigningOut(true)
                await signOut({ callbackUrl: "/login" })
              }}
              disabled={signingOut}
              className="text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors flex-shrink-0 disabled:opacity-60"
            >
              {signingOut ? "…" : "Logga ut"}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
