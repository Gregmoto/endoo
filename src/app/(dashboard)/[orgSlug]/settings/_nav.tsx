"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_SECTIONS = [
  {
    label: "Organisation",
    items: [
      { href: "company",   label: "Företagsuppgifter" },
      { href: "invoices",  label: "Fakturainställningar" },
      { href: "payments",  label: "Betalningsinställningar" },
      { href: "email",     label: "E-postinställningar" },
      { href: "branding",  label: "Varumärke" },
    ],
  },
  {
    label: "Konto",
    items: [
      { href: "users",        label: "Användare & roller" },
      { href: "security",     label: "Säkerhet" },
      { href: "subscription", label: "Abonnemang" },
    ],
  },
  {
    label: "Importera data",
    items: [
      { href: "import/sie", label: "SIE-import" },
    ],
  },
  {
    label: "Utvecklare",
    items: [
      { href: "api", label: "API-nycklar" },
    ],
  },
]

const AGENCY_SECTION = {
  label: "Byrå",
  items: [
    { href: "agency", label: "Byråinställningar" },
  ],
}

interface SettingsNavProps {
  orgSlug: string
  isAgency: boolean
}

export function SettingsNav({ orgSlug, isAgency }: SettingsNavProps) {
  const pathname = usePathname()
  const base = `/${orgSlug}/settings`

  const sections = isAgency
    ? [...NAV_SECTIONS, AGENCY_SECTION]
    : NAV_SECTIONS

  return (
    <aside className="w-52 flex-shrink-0 border-r border bg-card">
      <div className="px-4 py-5 border-b border">
        <h2 className="text-sm font-semibold text-foreground">Inställningar</h2>
      </div>
      <nav className="px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const href = `${base}/${item.href}`
                const active = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "block px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
