"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { NAV_CATEGORIES } from "@/lib/navigation/config"
import { useActiveCategory } from "@/lib/navigation/use-active-category"
import { TopBarCategories } from "./TopBarCategories"
import { TopBarRight } from "./TopBarRight"
import { SubBar } from "./SubBar"
import { MobileSlideOver } from "./MobileSlideOver"

interface Props {
  orgSlug: string
  orgName: string
  orgType: "agency" | "customer"
  orgId: string
  userEmail: string
  userName?: string | null
  orgPlan?: string
  logoUrl?: string | null
  brandingDisplayName?: string | null
}

export function TopBar({
  orgSlug,
  orgName,
  orgType,
  orgId,
  userEmail,
  userName,
  logoUrl,
  brandingDisplayName,
}: Props) {
  const [slideOpen, setSlideOpen] = useState(false)
  const { activeCategory } = useActiveCategory(orgSlug)

  const categories = NAV_CATEGORIES.filter(
    (cat) => !cat.visibleWhen || cat.visibleWhen(orgType)
  )

  const subItems = activeCategory?.subItems ?? []

  return (
    <>
      {/* ── Top bar row ──────────────────────────────────────────────────────── */}
      <div className="h-14 bg-background border-b border-border flex items-center px-4 gap-2">

        {/* Mobile: hamburger button */}
        <button
          onClick={() => setSlideOpen(true)}
          className="md:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Öppna meny"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3"  width="20" height="2" rx="1" />
            <rect y="9"  width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>

        {/* Logo */}
        <Link
          href={`/${orgSlug}`}
          className="flex items-center gap-2 flex-shrink-0 mr-0 md:mr-4"
        >
          {logoUrl ? (
            <div className="relative h-7 w-20">
              <Image
                src={logoUrl}
                alt={brandingDisplayName ?? orgName}
                fill
                className="object-contain object-left"
                unoptimized
              />
            </div>
          ) : (
            <span className="text-base md:text-lg font-bold text-primary">
              {brandingDisplayName ?? "Endoo"}
            </span>
          )}
        </Link>

        {/* Desktop: category tabs (flex-1 fills remaining space) */}
        <div className="hidden md:flex flex-1 items-stretch h-full min-w-0">
          <TopBarCategories orgSlug={orgSlug} categories={categories} />
        </div>

        {/* Right side controls */}
        <div className="ml-auto md:ml-0 flex-shrink-0">
          <TopBarRight
            orgSlug={orgSlug}
            orgName={orgName}
            orgId={orgId}
            userEmail={userEmail}
            userName={userName}
          />
        </div>
      </div>

      {/* ── Sub bar (desktop only, shown when active category has sub items) ── */}
      {subItems.length > 0 && (
        <div className="hidden md:block">
          <SubBar orgSlug={orgSlug} subItems={subItems} />
        </div>
      )}

      {/* ── Mobile slide-over ────────────────────────────────────────────────── */}
      <MobileSlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        orgSlug={orgSlug}
        orgName={orgName}
        orgId={orgId}
        userEmail={userEmail}
        userName={userName}
        categories={categories}
      />
    </>
  )
}
