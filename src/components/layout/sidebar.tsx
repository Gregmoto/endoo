"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { cn, stringToColor, initials } from "@/lib/utils"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

const NAV_GROUPS = [
  {
    label: "Fakturering",
    items: [
      { label: "Översikt",       href: "",                   icon: "▦" },
      { label: "Fakturor",       href: "/invoices",          icon: "◧" },
      { label: "Offerter",       href: "/quotes",            icon: "◩" },
      { label: "Lev.fakturor",   href: "/supplier-invoices", icon: "◨" },
      { label: "Betalningar",    href: "/payments",          icon: "◎" },
      { label: "Avtal",          href: "/contracts",         icon: "↺" },
      { label: "Signeringar",   href: "/signatures",        icon: "✍" },
    ],
  },
  {
    label: "Bokföring",
    items: [
      { label: "Verifikat",      href: "/journals",          icon: "◱" },
      { label: "Kontoplan",      href: "/accounts",          icon: "▤" },
      { label: "Rapporter",      href: "/reports",           icon: "◧" },
      { label: "Moms",           href: "/tax/vat",           icon: "◰" },
      { label: "Analys",         href: "/analytics",         icon: "◎" },
    ],
  },
  {
    label: "Register",
    items: [
      { label: "Kunder",         href: "/contacts",          icon: "◈" },
      { label: "Produkter",      href: "/products",          icon: "◉" },
      { label: "Lager",          href: "/inventory",         icon: "▣" },
    ],
  },
]

const BOTTOM_ITEMS = [
  { label: "Uppgifter",     href: "/tasks",    icon: "☑" },
  { label: "Team",          href: "/team",     icon: "◫" },
  { label: "Inställningar", href: "/settings", icon: "◌" },
  { label: "Audit log",     href: "/audit",    icon: "◷" },
]

type Org = { id: string; name: string; slug: string; type: string; role: string }

interface SidebarProps {
  orgSlug:              string
  orgName:              string
  orgType:              "agency" | "customer"
  userEmail:            string
  isImpersonating?:     boolean
  logoUrl?:             string | null
  brandingDisplayName?: string | null
}

function SidebarContent({
  orgSlug,
  orgName,
  orgType,
  userEmail,
  isImpersonating,
  logoUrl,
  brandingDisplayName,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const base     = `/${orgSlug}`

  const [orgOpen, setOrgOpen]   = useState(false)
  const [orgs, setOrgs]         = useState<Org[]>([])
  const [switching, setSwitching] = useState(false)
  const dropdownRef              = useRef<HTMLDivElement>(null)

  function isActive(href: string) {
    const full = `${base}${href}`
    if (href === "") return pathname === base
    return pathname.startsWith(full)
  }

  useEffect(() => {
    if (!orgOpen || orgs.length > 0) return
    fetch("/api/auth/orgs")
      .then((r) => r.ok ? r.json() : [])
      .then(setOrgs)
  }, [orgOpen, orgs.length])

  useEffect(() => {
    if (!orgOpen) return
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOrgOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [orgOpen])

  async function switchOrg(org: Org) {
    if (org.slug === orgSlug) { setOrgOpen(false); return }
    setSwitching(true)
    const res = await fetch("/api/auth/switch-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: org.id }),
    })
    if (res.ok) {
      const { slug } = await res.json()
      router.push(`/${slug}`)
    }
    setSwitching(false)
    setOrgOpen(false)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <div className="relative h-7 w-20 flex-shrink-0">
              <Image src={logoUrl} alt={brandingDisplayName ?? orgName} fill className="object-contain object-left" unoptimized />
            </div>
          ) : (
            <>
              <span className="text-lg font-bold text-brand-600">{brandingDisplayName ?? "Endoo"}</span>
              {orgType === "agency" && (
                <span className="text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                  Byrå
                </span>
              )}
            </>
          )}
        </div>
        <NotificationBell />
      </div>

      {/* Org switcher */}
      <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-800/50 relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setOrgOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors min-h-[44px]"
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: stringToColor(orgName) }}
          >
            {initials(orgName, 1)}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1 text-left">{orgName}</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs">{orgOpen ? "▲" : "▼"}</span>
        </button>

        {orgOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
            {orgs.length === 0 && <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Laddar…</p>}
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => switchOrg(org)}
                disabled={switching}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                  org.slug === orgSlug && "bg-brand-50 dark:bg-brand-900/20"
                )}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: stringToColor(org.name) }}
                >
                  {initials(org.name, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", org.slug === orgSlug ? "font-semibold text-brand-700 dark:text-brand-400" : "text-gray-700 dark:text-gray-200")}>
                    {org.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{org.type === "agency" ? "Byrå" : "Kund"}</p>
                </div>
                {org.slug === orgSlug && <span className="text-brand-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search trigger */}
      <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-800/50">
        <button
          onClick={() => {
            const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
            window.dispatchEvent(e)
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
          <span className="flex-1 text-left text-xs">Sök…</span>
          <kbd className="text-[10px] bg-gray-200 dark:bg-gray-700 dark:text-gray-400 px-1 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4 bg-white dark:bg-gray-900">
        {orgType === "agency" && !isImpersonating && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Byrå</p>
            <div className="space-y-0.5">
              <Link
                href={`${base}/clients`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                  isActive("/clients") ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <span className="text-base leading-none">◈</span>
                Kundkonton
              </Link>
              <Link
                href={`${base}/alerts`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                  isActive("/alerts") ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <span className="text-base leading-none">▲</span>
                Varningar
              </Link>
            </div>
          </div>
        )}
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={`${base}${item.href}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                    isActive(item.href) ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5 flex-shrink-0">
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`${base}${item.href}`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
              isActive(item.href) ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <div className="flex items-center gap-2 px-3 py-2 mt-1">
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{userEmail}</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden"
    else            document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [drawerOpen])

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────────────── */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col md:w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-10">
        <SidebarContent {...props} />
      </aside>

      {/* ── Mobile top bar (hidden on desktop) ─────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-20 h-12 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Öppna meny"
        >
          {/* Hamburger */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3"  width="20" height="2" rx="1" />
            <rect y="9"  width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>

        <span className="absolute left-1/2 -translate-x-1/2 text-base font-bold text-brand-600 pointer-events-none">
          Endoo
        </span>

        <NotificationBell />
      </header>

      {/* ── Mobile drawer overlay ───────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />

          {/* Drawer panel */}
          <aside
            className={cn(
              "md:hidden fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-900 shadow-2xl",
              "w-[85vw] max-w-xs",
              "animate-drawer-in",
            )}
          >
            {/* Close button */}
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 z-10"
              aria-label="Stäng meny"
            >
              ✕
            </button>
            <SidebarContent {...props} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}
    </>
  )
}
