/**
 * PDF color constants — always light mode.
 * @react-pdf/renderer does not support CSS variables or dark mode.
 * These values are intentionally hardcoded.
 */
export const PDF_COLORS = {
  text:        "#1a1d2e",
  textMuted:   "#6b7280",
  heading:     "#0a0d1e",
  border:      "#e5e7eb",
  borderStrong:"#1a1d2e",
  brand:       "#3b55e6",
  background:  "#ffffff",
  surface:     "#f8f9fb",
  success:     "#16a34a",
  destructive: "#dc2626",
  warning:     "#d97706",
} as const
