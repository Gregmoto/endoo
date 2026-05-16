"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { cn, stringToColor, initials } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Översikt",      href: "",               icon: "▦" },
  { label: "Fakturor",      href: "/invoices",       icon: "◧" },
  { label: "Kontakter",     href: "/contacts",       icon: "◈" },
  { label: "Produkter",     href: "/products",       icon: "◉" },
  { label: "Avtal",         href: "/contracts",      icon: "↺" },
  { label: "Betalningar",   href: "/payments",       icon: "◎" },
]

const BOTTOM_ITEMS = [
  { label: "Team",          href: "/team",           icon: "◫" },
  { label: "Inställningar", href: "/settings",       icon: "◌" },
  { label: "Audit log",     href: "/audit",          icon: "◷" },
]

type Org = {
  id: string
  name: string
  slug: string
  type: string
  role: string
}

interface SidebarProps {
  orgSlug: string
  orgName: string
  orgType: "agency" | "customer"
  userEmail: string
  isImpersonating?: boolean
}

export function Sidebar({ orgSlug, orgName, orgType, userEmail, isImpersonating }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/${orgSlug}`

  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  function isActive(href: string) {
    const full = `${base}${href}`
    if (href === "") return pathname === base
    return pathname.startsWith(full)
  }

  // Fetch orgs on first open
  useEffect(() => {
    if (!open || orgs.length > 0) return
    fetch("/api/auth/orgs")
      .then((r) => r.ok ? r.json() : [])
      .then(setOrgs)
  }, [open, orgs.length])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  async function switchOrg(org: Org) {
    if (org.slug === orgSlug) { setOpen(false); return }
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
    setOpen(false)
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-100 flex flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <span className="text-lg font-bold text-brand-600">Endoo</span>
        {orgType === "agency" && (
          <span className="ml-2 text-xs font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
            Byrå
          </span>
        )}
      </div>

      {/* Org switcher */}
      <div className="px-3 py-2 border-b border-gray-50 relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: stringToColor(orgName) }}
          >
            {initials(orgName, 1)}
          </div>
          <span className="text-sm font-medium text-gray-700 truncate flex-1 text-left">{orgName}</span>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
            {orgs.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">Laddar…</p>
            )}
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => switchOrg(org)}
                disabled={switching}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors",
                  org.slug === orgSlug && "bg-brand-50"
                )}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: stringToColor(org.name) }}
                >
                  {initials(org.name, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", org.slug === orgSlug ? "font-semibold text-brand-700" : "text-gray-700")}>
                    {org.name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{org.type === "agency" ? "Byrå" : "Kund"}</p>
                </div>
                {org.slug === orgSlug && <span className="text-brand-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {orgType === "agency" && !isImpersonating && (
          <Link
            href={`${base}/clients`}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive("/clients")
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <span className="text-base leading-none">◈</span>
            Kundkonton
          </Link>
        )}
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`${base}${item.href}`}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`${base}${item.href}`}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-brand-50 text-brand-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* User */}
        <div className="flex items-center gap-2 px-3 py-2 mt-1">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-gray-500 truncate">{userEmail}</span>
        </div>
      </div>
    </aside>
  )
}
