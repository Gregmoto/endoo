/**
 * Contrast and color utilities for branding overrides.
 * Used when organizations supply a custom primaryColor.
 */

/** Parse a hex color to [r, g, b] in 0-255 range */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "")
  const full  = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean
  if (full.length !== 6) return null
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Relative luminance per WCAG 2.1 */
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** WCAG contrast ratio between two hex colors */
export function contrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  if (!c1 || !c2) return 1
  const l1 = luminance(...c1)
  const l2 = luminance(...c2)
  const lighter = Math.max(l1, l2)
  const darker  = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Returns "white" or "black" — whichever has better contrast against bg */
export function getBestTextColor(bgHex: string): "white" | "black" {
  const onWhite = contrastRatio(bgHex, "#ffffff") // audit-ok: WCAG reference white/black
  const onBlack = contrastRatio(bgHex, "#000000") // audit-ok
  return onBlack > onWhite ? "black" : "white"
}

/** Lighten a hex color by mixing with white (0 = original, 1 = white) */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb.map(c => Math.round(c + (255 - c) * amount))
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("")
}

/** Darken a hex color by mixing with black (0 = original, 1 = black) */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb.map(c => Math.round(c * (1 - amount)))
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("")
}

/**
 * Given a brand hex color from an org's branding, return the version to use
 * in dark mode. Lightens dark colors to ensure minimum contrast on dark bg.
 */
export function adjustForDarkMode(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const lum = luminance(...rgb)
  // If the color is dark (lum < 0.2), lighten it significantly for dark backgrounds
  if (lum < 0.2) return lighten(hex, 0.5)
  // If medium dark, lighten a bit
  if (lum < 0.4) return lighten(hex, 0.25)
  return hex
}

/**
 * Convert a hex color to an approximate oklch string.
 * Uses a simplified conversion — good enough for CSS injection.
 */
export function hexToOklch(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return "oklch(0.5 0.15 250)"
  const lum = luminance(...rgb)
  // Approximate L from luminance, C from saturation, H from hue
  const L = Math.pow(lum, 1 / 3) * 0.9 + 0.05
  const [r, g, b] = rgb.map(c => c / 255)
  // Rough hue estimation
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d   = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d % 6) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
    if (h < 0) h += 360
  }
  const C = d > 0 ? d * 0.15 : 0
  return `oklch(${L.toFixed(2)} ${C.toFixed(3)} ${Math.round(h)})`
}
