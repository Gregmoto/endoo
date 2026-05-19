"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn, stringToColor, initials } from "@/lib/utils"

type Org = { id: string; name: string; slug: string; type: string; role: string }

interface Props {
  orgSlug: string
  orgName: string
  className?: string
}

export function OrgSwitcher({ orgSlug, orgName, className }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [switching, setSwitching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || orgs.length > 0) return
    fetch("/api/auth/orgs")
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrgs)
  }, [open, orgs.length])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-accent transition-colors max-w-[180px]"
      >
        <div
          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
          style={{ background: stringToColor(orgName) }}
        >
          {initials(orgName, 1)}
        </div>
        <span className="truncate text-xs font-medium text-foreground">{orgName}</span>
        <span className="text-muted-foreground text-[10px] flex-shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
          {orgs.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Laddar…</p>
          )}
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org)}
              disabled={switching}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors",
                org.slug === orgSlug && "bg-accent/50"
              )}
            >
              <div
                className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: stringToColor(org.name) }}
              >
                {initials(org.name, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm truncate",
                    org.slug === orgSlug ? "font-semibold text-foreground" : "text-foreground"
                  )}
                >
                  {org.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {org.type === "agency" ? "Byrå" : "Kund"}
                </p>
              </div>
              {org.slug === orgSlug && <span className="text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
