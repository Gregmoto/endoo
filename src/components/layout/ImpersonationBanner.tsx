"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ImpersonationBannerProps {
  agencyName: string
  agencySlug: string
}

export function ImpersonationBanner({ agencyName, agencySlug }: ImpersonationBannerProps) {
  const router  = useRouter()
  const [leaving, setLeaving] = useState(false)

  async function exit() {
    setLeaving(true)
    const res = await fetch("/api/auth/exit-impersonation", { method: "POST" })
    if (res.ok) {
      router.push(`/${agencySlug}`)
    } else {
      setLeaving(false)
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold">◈</span>
        <span>
          Du arbetar som <strong>kundkonto</strong> via <strong>{agencyName}</strong>
        </span>
      </div>
      <button
        onClick={exit}
        disabled={leaving}
        className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-md transition-colors disabled:opacity-60"
      >
        {leaving ? "Avslutar…" : "← Tillbaka till byrån"}
      </button>
    </div>
  )
}
