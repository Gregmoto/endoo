/**
 * GET /api/portal/[orgSlug]/auth/verify?token=RAW_TOKEN
 * Verify a magic-link token, issue a portal session cookie, redirect to portal home.
 *
 * If the request IP prefix differs from the token's stored IP prefix, a 6-digit
 * code challenge is triggered instead of issuing a session directly.
 */

import { prisma }        from "@/lib/prisma"
import { hashToken }     from "@/lib/signing/tokens"
import {
  signPortalJwt,
  PORTAL_COOKIE,
  COOKIE_OPTIONS,
  getClientIp,
  ipPrefix,
  verifyTrustedDeviceJwt,
  TRUSTED_DEVICE_COOKIE,
  signTrustedDeviceJwt,
  TRUSTED_DEVICE_COOKIE_OPTIONS,
} from "@/lib/portal/auth"
import { cookies }        from "next/headers"
import { NextResponse }   from "next/server"
import crypto             from "crypto"

const BASE_URL          = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
const RATE_LIMIT_VERIFY = 10  // per IP per hour

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const url         = new URL(req.url)
  const rawToken    = url.searchParams.get("token")

  const fail = (msg: string) =>
    NextResponse.redirect(`${BASE_URL}/portal/${orgSlug}/login?error=${encodeURIComponent(msg)}`)

  if (!rawToken) return fail("Ogiltig länk")

  const ip        = getClientIp(req)
  const userAgent = req.headers.get("user-agent") ?? "unknown"

  // IP-based rate limit: max 10 verify attempts per hour
  const hourAgo       = new Date(Date.now() - 60 * 60_000)
  const recentAttempts = await prisma.portalAuthAttempt.count({
    where: { ip, createdAt: { gte: hourAgo } },
  })
  if (recentAttempts >= RATE_LIMIT_VERIFY) {
    return fail("För många inloggningsförsök från din IP. Försök igen senare.")
  }

  const tokenHash = hashToken(rawToken)

  const magic = await prisma.portalMagicToken.findUnique({
    where:  { tokenHash },
    select: {
      id: true, contactId: true, organizationId: true, email: true,
      expiresAt: true, usedAt: true, requestIp: true,
    },
  })

  // Log attempt (after lookup so we have orgId/contactId if available)
  const logAttempt = (success: boolean, failureReason?: string) =>
    prisma.portalAuthAttempt.create({
      data: {
        organizationId: magic?.organizationId ?? "unknown",
        contactId:      magic?.contactId,
        email:          magic?.email ?? "unknown",
        ip,
        userAgent,
        success,
        failureReason,
      },
    }).catch(() => {/* non-fatal */})

  if (!magic)                         { await logAttempt(false, "token_not_found"); return fail("Länken är ogiltig") }
  if (magic.usedAt)                   { await logAttempt(false, "token_reused");    return fail("Länken har redan använts") }
  if (magic.expiresAt < new Date())   { await logAttempt(false, "token_expired");   return fail("Länken har gått ut") }

  // Verify org slug matches
  const org = await prisma.organization.findUnique({
    where:  { id: magic.organizationId },
    select: { id: true, slug: true },
  })
  if (!org || org.slug !== orgSlug) { await logAttempt(false, "org_mismatch"); return fail("Ogiltig länk") }

  // Check trusted device cookie — bypass IP check if valid
  const cookieStore = await cookies()
  const deviceToken = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value
  let trustedDeviceId: string | null = null

  if (deviceToken) {
    try {
      const claims = await verifyTrustedDeviceJwt(deviceToken)
      if (claims.sub === magic.contactId && claims.org === magic.organizationId) {
        // Verify device is still active in DB
        const device = await prisma.trustedDevice.findUnique({
          where:  { deviceId: claims.deviceId },
          select: { id: true, revokedAt: true },
        })
        if (device && !device.revokedAt) {
          trustedDeviceId = claims.deviceId
          // Update lastUsedAt
          prisma.trustedDevice.update({
            where: { deviceId: claims.deviceId },
            data:  { lastUsedAt: new Date() },
          }).catch(() => {/* non-fatal */})
        }
      }
    } catch {
      // Invalid trusted device token — ignore and continue with normal flow
    }
  }

  // IP prefix mismatch check (skip if trusted device)
  const storedPrefix  = magic.requestIp ? ipPrefix(magic.requestIp) : null
  const currentPrefix = ipPrefix(ip)
  const ipMismatch    = storedPrefix && storedPrefix !== currentPrefix && !trustedDeviceId

  if (ipMismatch) {
    // Generate 6-digit code, store SHA-256 hash, redirect to code entry page
    const code        = String(Math.floor(100000 + Math.random() * 900000))
    const pendingCode = crypto.createHash("sha256").update(code).digest("hex")

    await prisma.portalMagicToken.update({
      where: { id: magic.id },
      data:  { pendingCode },
    })

    // Send code via email (non-fatal)
    import("@/lib/portal/emails").then(({ sendPortalSecurityCode }) => {
      sendPortalSecurityCode({
        to:    magic.email,
        code,
        orgId: magic.organizationId,
      }).catch(err => console.error("[portal/auth/verify] security code email", err))
    }).catch(() => {/* module not available yet */})

    await logAttempt(false, "ip_mismatch_challenge")
    return NextResponse.redirect(
      `${BASE_URL}/portal/${orgSlug}/auth/verify?token=${encodeURIComponent(rawToken)}`
    )
  }

  // Mark token as used
  await prisma.portalMagicToken.update({
    where: { id: magic.id },
    data:  { usedAt: new Date() },
  })

  const jwt = await signPortalJwt({
    sub:   magic.contactId,
    org:   magic.organizationId,
    email: magic.email,
  })

  cookieStore.set(PORTAL_COOKIE, jwt, COOKIE_OPTIONS)

  await logAttempt(true)

  // Refresh trusted device cookie TTL if present
  if (trustedDeviceId) {
    const refreshed = await signTrustedDeviceJwt({
      deviceId: trustedDeviceId,
      sub:      magic.contactId,
      org:      magic.organizationId,
    })
    cookieStore.set(TRUSTED_DEVICE_COOKIE, refreshed, TRUSTED_DEVICE_COOKIE_OPTIONS)
  }

  return NextResponse.redirect(`${BASE_URL}/portal/${orgSlug}`)
}
