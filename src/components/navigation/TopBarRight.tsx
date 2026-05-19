"use client"

import { OrgSwitcher } from "./OrgSwitcher"
import { FiscalYearSwitcher } from "./FiscalYearSwitcher"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AvatarDropdown } from "./AvatarDropdown"

interface Props {
  orgSlug: string
  orgName: string
  orgId: string
  userEmail: string
  userName?: string | null
}

export function TopBarRight({ orgSlug, orgName, orgId, userEmail, userName }: Props) {
  function openSearch() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <OrgSwitcher orgSlug={orgSlug} orgName={orgName} className="hidden md:flex" />
      <FiscalYearSwitcher orgId={orgId} className="hidden md:flex" />

      {/* ⌘K shortcut hint — desktop only */}
      <button
        onClick={openSearch}
        className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-muted hover:bg-accent px-2 py-1 rounded-md transition-colors"
        title="Snabbsök (⌘K)"
      >
        <kbd className="font-mono text-[10px]">⌘K</kbd>
      </button>

      <NotificationBell />
      <AvatarDropdown orgSlug={orgSlug} userEmail={userEmail} userName={userName} />
    </div>
  )
}
