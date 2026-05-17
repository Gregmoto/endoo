"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

const REPORT_CARDS = [
  {
    label:       "Provbalans",
    description: "Debet- och kreditsaldon per konto för en period.",
    href:        "/reports/trial-balance",
    icon:        "⊟",
  },
  {
    label:       "Resultatrapport",
    description: "Intäkter och kostnader — beräknar periodens resultat.",
    href:        "/reports/income-statement",
    icon:        "⊞",
  },
  {
    label:       "Balansrapport",
    description: "Tillgångar, skulder och eget kapital per ett datum.",
    href:        "/reports/balance-sheet",
    icon:        "⊠",
  },
  {
    label:       "Momsrapport",
    description: "SKV momsdeklaration — utgående och ingående moms.",
    href:        "/reports/vat",
    icon:        "⊡",
  },
  {
    label:       "Huvudbok",
    description: "Samtliga verifikat per konto med löpande saldo.",
    href:        "/reports/general-ledger",
    icon:        "≡",
  },
]

export default function ReportsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const base = `/${orgSlug}`

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Rapporter</h1>
      <p className="text-sm text-gray-500 mb-8">Välj en rapport nedan.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.map((card) => (
          <Link
            key={card.href}
            href={`${base}${card.href}`}
            className="flex flex-col gap-2 p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-400 hover:shadow-sm transition-all"
          >
            <span className="text-2xl leading-none">{card.icon}</span>
            <span className="font-semibold text-gray-900 text-sm">{card.label}</span>
            <span className="text-xs text-gray-500 leading-relaxed">{card.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
