import { prisma } from "@/lib/prisma"
import { type ResolvedBranding, ENDOO_DEFAULTS } from "./types"

type RawProfile = {
  displayName:     string | null
  logoUrl:         string | null
  logoDarkUrl:     string | null
  faviconUrl:      string | null
  primaryColor:    string | null
  accentColor:     string | null
  textOnPrimary:   string | null
  senderName:      string | null
  senderEmail:     string | null
  replyTo:         string | null
  emailLogoUrl:    string | null
  pdfLogoUrl:      string | null
  pdfAccentColor:  string | null
  pdfFooterText:   string | null
  pdfShowPoweredBy: boolean
  applyToClients:  boolean
}

const BRANDING_SELECT = {
  displayName: true, logoUrl: true, logoDarkUrl: true, faviconUrl: true,
  primaryColor: true, accentColor: true, textOnPrimary: true,
  senderName: true, senderEmail: true, replyTo: true, emailLogoUrl: true,
  pdfLogoUrl: true, pdfAccentColor: true, pdfFooterText: true,
  pdfShowPoweredBy: true, applyToClients: true,
} as const

function merge(profile: RawProfile, source: "own" | "agency"): ResolvedBranding {
  return {
    displayName:      profile.displayName,
    logoUrl:          profile.logoUrl,
    logoDarkUrl:      profile.logoDarkUrl,
    faviconUrl:       profile.faviconUrl,
    primaryColor:     profile.primaryColor     ?? ENDOO_DEFAULTS.primaryColor,
    accentColor:      profile.accentColor      ?? ENDOO_DEFAULTS.accentColor,
    textOnPrimary:    profile.textOnPrimary    ?? ENDOO_DEFAULTS.textOnPrimary,
    senderName:       profile.senderName,
    senderEmail:      profile.senderEmail,
    replyTo:          profile.replyTo,
    emailLogoUrl:     profile.emailLogoUrl,
    pdfLogoUrl:       profile.pdfLogoUrl,
    pdfAccentColor:   profile.pdfAccentColor   ?? ENDOO_DEFAULTS.pdfAccentColor,
    pdfFooterText:    profile.pdfFooterText,
    pdfShowPoweredBy: profile.pdfShowPoweredBy,
    source,
  }
}

const DEFAULTS: ResolvedBranding = {
  displayName: null, logoUrl: null, logoDarkUrl: null, faviconUrl: null,
  senderName: null, senderEmail: null, replyTo: null, emailLogoUrl: null,
  pdfLogoUrl: null, pdfFooterText: null,
  ...ENDOO_DEFAULTS,
}

export async function resolveBranding(organizationId: string): Promise<ResolvedBranding> {
  // 1. Own branding profile
  const own = await prisma.brandingProfile.findUnique({
    where: { organizationId },
    select: BRANDING_SELECT,
  })
  if (own) return merge(own, "own")

  // 2. Agency branding (if this org is a managed client)
  const relationship = await prisma.agencyClientRelationship.findFirst({
    where: { clientId: organizationId, status: "active" },
    include: {
      agency: { select: { brandingProfile: { select: BRANDING_SELECT } } },
    },
  })
  const agencyProfile = relationship?.agency?.brandingProfile
  if (agencyProfile?.applyToClients) return merge(agencyProfile, "agency")

  return DEFAULTS
}
