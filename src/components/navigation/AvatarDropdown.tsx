"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { cn, initials } from "@/lib/utils"
import { useTheme } from "next-themes"
import { signOut } from "next-auth/react"
import { APP_VERSION } from "@/lib/version"

interface Props {
  orgSlug: string
  userEmail: string
  userName?: string | null
}

const THEME_OPTIONS = [
  { value: "light",  label: "Ljust"  },
  { value: "dark",   label: "Mörkt"  },
  { value: "system", label: "System" },
] as const

export function AvatarDropdown({ orgSlug, userEmail, userName }: Props) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const displayName = userName || userEmail
  const avatarInitials = initials(displayName, 2)
  const currentThemeLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? "System"

  useEffect(() => {
    if (!open) { setThemeOpen(false); return }
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setThemeOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold hover:opacity-90 transition-opacity flex-shrink-0"
        aria-label="Användarmeny"
      >
        {avatarInitials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {/* User info */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            {userName && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
          </div>

          {/* Navigation links */}
          <div className="py-1">
            <Link
              href={`/${orgSlug}/settings`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <span className="w-4 text-center">⚙</span>
              Inställningar
            </Link>
            <Link
              href={`/${orgSlug}/team`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <span className="w-4 text-center">👥</span>
              Team
            </Link>
            <Link
              href={`/${orgSlug}/audit`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <span className="w-4 text-center">📋</span>
              Audit log
            </Link>

            {/* Theme sub-menu */}
            <div>
              <button
                onClick={() => setThemeOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <span className="w-4 text-center">🎨</span>
                <span className="flex-1 text-left">Tema</span>
                <span className="text-xs text-muted-foreground">
                  {currentThemeLabel} {themeOpen ? "▲" : "▶"}
                </span>
              </button>
              {themeOpen && (
                <div className="bg-muted/50 border-y border-border">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setTheme(opt.value); setThemeOpen(false) }}
                      className={cn(
                        "w-full text-left px-8 py-2 text-sm transition-colors hover:bg-accent",
                        theme === opt.value
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <span className="w-4 text-center">❓</span>
              Hjälp & support
            </Link>
          </div>

          <div className="border-t border-border py-1">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
            >
              <span className="w-4 text-center">🚪</span>
              {signingOut ? "Loggar ut…" : "Logga ut"}
            </button>
            <p className="px-4 py-1.5 text-[10px] text-muted-foreground/50 select-none">
              Endoo v{APP_VERSION}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
