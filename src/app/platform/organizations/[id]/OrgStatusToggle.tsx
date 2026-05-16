"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function OrgStatusToggle({ orgId, isActive }: { orgId: string; isActive: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    await fetch(`/api/platform/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
        isActive
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-green-200 text-green-700 hover:bg-green-50"
      }`}
    >
      {loading ? "…" : isActive ? "Inaktivera konto" : "Aktivera konto"}
    </button>
  )
}
