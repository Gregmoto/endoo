/**
 * GET /api/design/contrast-check?fg=#xxxxxx&bg=#xxxxxx
 * Returns WCAG contrast ratio and AA/AAA pass/fail for a color pair.
 * Useful for validating custom branding colors.
 */

import { contrastRatio, getBestTextColor, adjustForDarkMode } from "@/lib/design-system/contrast"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fg  = url.searchParams.get("fg") ?? "#111827" // audit-ok: API parameter default
  const bg  = url.searchParams.get("bg") ?? "#ffffff" // audit-ok

  const ratio = contrastRatio(fg, bg)
  const aaLarge  = ratio >= 3.0
  const aaNormal = ratio >= 4.5
  const aaaLarge = ratio >= 4.5
  const aaaNormal= ratio >= 7.0

  return Response.json({
    fg,
    bg,
    ratio:            Math.round(ratio * 100) / 100,
    wcag: {
      aa_normal:  aaNormal,
      aa_large:   aaLarge,
      aaa_normal: aaaNormal,
      aaa_large:  aaaLarge,
    },
    bestTextOnFg: getBestTextColor(fg),
    bestTextOnBg: getBestTextColor(bg),
    darkModeAdjusted: adjustForDarkMode(fg),
  })
}
