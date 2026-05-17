export type ResolvedBranding = {
  displayName:     string | null
  logoUrl:         string | null
  logoDarkUrl:     string | null
  faviconUrl:      string | null
  primaryColor:    string        // always has a value (default or custom)
  accentColor:     string
  textOnPrimary:   string
  senderName:      string | null
  senderEmail:     string | null
  replyTo:         string | null
  emailLogoUrl:    string | null
  pdfLogoUrl:      string | null
  pdfAccentColor:  string
  pdfFooterText:   string | null
  pdfShowPoweredBy: boolean
  // Source org that provided branding (own | agency | default)
  source: "own" | "agency" | "default"
}

export const ENDOO_DEFAULTS: Omit<ResolvedBranding, "displayName" | "logoUrl" | "logoDarkUrl" | "faviconUrl" | "senderName" | "senderEmail" | "replyTo" | "emailLogoUrl" | "pdfLogoUrl" | "pdfFooterText"> = {
  primaryColor:    "#4f46e5",
  accentColor:     "#6366f1",
  textOnPrimary:   "#ffffff",
  pdfAccentColor:  "#4f46e5",
  pdfShowPoweredBy: true,
  source:          "default",
}
