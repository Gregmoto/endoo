"use client"

import dynamic from "next/dynamic"

const CookieBanner = dynamic(
  () => import("@/components/ui/CookieBanner").then(m => m.CookieBanner),
  { ssr: false }
)

export function CookieBannerLazy() {
  return <CookieBanner />
}
