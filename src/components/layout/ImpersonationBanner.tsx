"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HealthBar, healthLabel } from "@/components/agency/HealthBar"
import { ClientSwitcher }         from "@/components/agency/ClientSwitcher"
import type { SnapshotClient }    from "@/components/agency/types"

interface ImpersonationBannerProps {
  agencyName: string
  agencySlug: string
  clientSlug: string
}

export function ImpersonationBanner({ agencyName, agencySlug, clientSlug }: ImpersonationBannerProps) {
  const router   = useRouter()
  const [leaving,   setLeaving]   = useState(false)
  const [switcher,  setSwitcher]  = useState(false)
  const [snapshot,  setSnapshot]  = useState<SnapshotClient | null>(null)

  useEffect(() => {
    fetch("/api/agency/clients")
      .then(r => r.ok ? r.json() : { clients: [] })
      .then(({ clients }: { clients: SnapshotClient[] }) => {
        const match = clients.find(c => c.clientSlug === clientSlug)
        if (match) setSnapshot(match)
      })
  }, [clientSlug])

  // Cmd+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSwitcher(v => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  async function exit() {
    setLeaving(true)
    const res = await fetch("/api/auth/exit-impersonation", { method: "POST" })
    if (res.ok) {
      router.push(`/${agencySlug}`)
    } else {
      setLeaving(false)
    }
  }

  const hl = snapshot ? healthLabel(snapshot.healthScore) : null

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-1.5 flex items-center gap-4 text-sm shadow-md">
        {/* Agency context */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-amber-900">◈</span>
          <span className="text-amber-100 text-xs">Via</span>
          <span className="font-semibold">{agencyName}</span>
        </div>

        {/* Divider */}
        <span className="text-amber-400">|</span>

        {/* Client health snapshot */}
        {snapshot ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="font-medium truncate">{snapshot.clientName}</span>
            <div className="hidden sm:flex items-center gap-2">
              {hl && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20`}>
                  {hl.label} {snapshot.healthScore}
                </span>
              )}
              <div className="w-20 hidden md:block">
                <HealthBar score={snapshot.healthScore} showLabel={false} size="sm" />
              </div>
            </div>
            {snapshot.errorCount > 0 && (
              <span className="hidden sm:inline text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                ● {snapshot.errorCount} fel
              </span>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setSwitcher(true)}
            className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-md transition-colors font-medium"
            title="Byt klient (⌘K)"
          >
            <span>Byt</span>
            <kbd className="text-[10px] opacity-70">⌘K</kbd>
          </button>

          <button
            onClick={exit}
            disabled={leaving}
            className="text-xs font-semibold bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded-md transition-colors disabled:opacity-60"
          >
            {leaving ? "Avslutar…" : "← Byrån"}
          </button>
        </div>
      </div>

      <ClientSwitcher open={switcher} onClose={() => setSwitcher(false)} />
    </>
  )
}
