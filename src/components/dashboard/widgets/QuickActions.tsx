"use client"
import Link from "next/link"

interface Action { label: string; href: string; icon: string }

export function QuickActions({ orgSlug, onNewEvent }: { orgSlug: string; onNewEvent: () => void }) {
  const actions: Action[] = [
    { label: "Ny faktura",            href: `/${orgSlug}/invoices/new`,        icon: "📄" },
    { label: "Ny kund",               href: `/${orgSlug}/contacts/new`,        icon: "👤" },
    { label: "Registrera betalning",  href: `/${orgSlug}/payments`,            icon: "💳" },
    { label: "Ladda upp lev.faktura", href: `/${orgSlug}/supplier-invoices`,   icon: "📥" },
    { label: "Ny uppgift",            href: `/${orgSlug}/tasks/new`,           icon: "☑" },
  ]

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">Snabbåtgärder</h2>
      <ul className="space-y-1">
        {actions.map(a => (
          <li key={a.href}>
            <Link
              href={a.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-sm text-foreground min-h-[44px]"
            >
              <span className="text-base leading-none w-5 text-center flex-shrink-0">{a.icon}</span>
              <span className="flex-1">{a.label}</span>
              <span className="text-muted-foreground">+</span>
            </Link>
          </li>
        ))}
        <li>
          <button
            onClick={onNewEvent}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-sm text-foreground min-h-[44px] w-full text-left"
          >
            <span className="text-base leading-none w-5 text-center flex-shrink-0">📅</span>
            <span className="flex-1">Ny händelse</span>
            <span className="text-muted-foreground">+</span>
          </button>
        </li>
      </ul>
    </div>
  )
}
