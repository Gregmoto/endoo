"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn, stringToColor, initials } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Översikt",      href: "",               icon: "▦" },
  { label: "Fakturor",      href: "/invoices",       icon: "◧" },
  { label: "Kontakter",     href: "/contacts",       icon: "◈" },
  { label: "Produkter",     href: "/products",       icon: "◉" },
  { label: "Betalningar",   href: "/payments",       icon: "◎" },
]

const BOTTOM_ITEMS = [
  { label: "Team",          href: "/team",           icon: "◫" },
  { label: "Inställningar", href: "/settings",       icon: "◌" },
  { label: "Audit log",     href: "/audit",          icon: "◷" },
]

interface SidebarProps {
  orgSlug: string
  orgName: string
  orgType: "agency" | "customer"
  userEmail: string
}

export function Sidebar({ orgSlug, orgName, orgType, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const base = `/app/${orgSlug}`

  function isActive(href: string) {
    const full = `${base}${href}`
    if (href === "") return pathname === base
    return pathname.startsWith(full)
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

      {/* Org switcher placeholder */}
      <div className="px-3 py-2 border-b border-gray-50">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: stringToColor(orgName) }}
          >
            {initials(orgName, 1)}
          </div>
          <span className="text-sm font-medium text-gray-700 truncate">{orgName}</span>
          <span className="ml-auto text-gray-400 text-xs">⌄</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
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
