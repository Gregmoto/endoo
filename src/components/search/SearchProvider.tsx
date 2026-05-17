"use client"

import { useState, useEffect } from "react"
import { CommandPalette } from "./CommandPalette"

interface Props {
  orgSlug: string
  orgId:   string
  children?: React.ReactNode
}

export function SearchProvider({ orgSlug, orgId, children }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        // Don't open if ClientSwitcher is already handling ⌘K
        // (ImpersonationBanner has its own ⌘K handler — they coexist because
        //  the banner sets open=true on its own switcher, not this one)
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <>
      {children}
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        orgSlug={orgSlug}
        orgId={orgId}
      />
    </>
  )
}
