"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "general",          label: "Allmänt" },
  { href: "numbering",        label: "Numrering" },
  { href: "payment-terms",    label: "Betalningsvillkor" },
  { href: "units",            label: "Enheter" },
  { href: "currencies",       label: "Valutor" },
  { href: "delivery-methods", label: "Leveranssätt" },
  { href: "delivery-terms",   label: "Leveransvillkor" },
  { href: "price-lists",      label: "Prislistor" },
  { href: "template",         label: "Fakturamall" },
  { href: "reminders",        label: "Påminnelser" },
  { href: "interest",         label: "Dröjsmålsränta" },
]

export default function InvoicingSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const base = `/${orgSlug}/settings/invoicing`

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Faktureringsinställningar</h1>
        <p className="text-sm text-muted-foreground mt-1">Konfigurera hur fakturor skapas, skickas och hanteras</p>
      </div>

      <div className="border-b border mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => {
            const href  = `${base}/${tab.href}`
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  active
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="max-w-3xl">{children}</div>
    </div>
  )
}
