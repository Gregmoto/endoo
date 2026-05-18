/**
 * Portal authentication helpers.
 *
 * Portal sessions are short-lived JWTs stored in an HttpOnly cookie.
 * They are entirely separate from NextAuth (which governs dashboard access).
 *
 * Cookie name : portal_session
 * Algorithm   : HS256
 * Secret      : NEXTAUTH_SECRET (reused — single secret, different audience)
 * Audience    : "endoo-portal"
 * TTL         : 7 days
 */

import { SignJWT, jwtVerify } from "jose"
import { cookies }            from "next/headers"
import { prisma }             from "@/lib/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export type PortalClaims = {
  sub:   string  // contactId
  org:   string  // organizationId
  email: string
}

export type TrustedDeviceClaims = {
  deviceId: string
  sub:      string  // contactId
  org:      string  // organizationId
}

export class PortalAuthError extends Error {
  constructor(message = "Portal authentication required") {
    super(message)
    this.name = "PortalAuthError"
  }
}

// ─── Secret ──────────────────────────────────────────────────────────────────

function secret(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error("NEXTAUTH_SECRET not set")
  return new TextEncoder().encode(s)
}

// ─── Cookie config ────────────────────────────────────────────────────────────

export const PORTAL_COOKIE = "portal_session"

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax"  as const,
  maxAge:   60 * 60 * 24 * 7,
  path:     "/",
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export async function signPortalJwt(claims: PortalClaims): Promise<string> {
  return new SignJWT({ org: claims.org, email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setAudience("endoo-portal")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret())
}

export async function verifyPortalJwt(token: string): Promise<PortalClaims> {
  const { payload } = await jwtVerify(token, secret(), { audience: "endoo-portal" })
  if (
    typeof payload.sub   !== "string" ||
    typeof payload.org   !== "string" ||
    typeof payload.email !== "string"
  ) throw new PortalAuthError("Malformed portal token")

  return { sub: payload.sub, org: payload.org as string, email: payload.email as string }
}

// ─── requirePortalAuth ────────────────────────────────────────────────────────
//
// Call from portal route handlers and server components.
// Verifies the portal_session cookie and checks that the org in the JWT
// matches the org identified by the URL slug.

export async function requirePortalAuth(
  orgSlug: string
): Promise<PortalClaims & { orgId: string; orgName: string }> {
  const cookieStore = await cookies()
  const raw         = cookieStore.get(PORTAL_COOKIE)?.value

  if (!raw) throw new PortalAuthError()

  let claims: PortalClaims
  try {
    claims = await verifyPortalJwt(raw)
  } catch {
    throw new PortalAuthError()
  }

  // Verify that the JWT org matches the org addressed in the URL.
  const org = await prisma.organization.findUnique({
    where:  { slug: orgSlug },
    select: { id: true, name: true },
  })
  if (!org || org.id !== claims.org) throw new PortalAuthError()

  return { ...claims, orgId: org.id, orgName: org.name }
}

// ─── IP helpers ──────────────────────────────────────────────────────────────

export function ipPrefix(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 — first 4 groups
    return ip.split(":").slice(0, 4).join(":")
  }
  // IPv4 — first 3 octets (/24)
  return ip.split(".").slice(0, 3).join(".")
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

// ─── Trusted device cookie ───────────────────────────────────────────────────

export const TRUSTED_DEVICE_COOKIE = "portal_trusted_device"

export const TRUSTED_DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge:   60 * 60 * 24 * 30,
  path:     "/",
}

export async function signTrustedDeviceJwt(claims: TrustedDeviceClaims): Promise<string> {
  return new SignJWT({ deviceId: claims.deviceId, org: claims.org })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setAudience("endoo-portal-device")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret())
}

export async function verifyTrustedDeviceJwt(token: string): Promise<TrustedDeviceClaims> {
  const { payload } = await jwtVerify(token, secret(), { audience: "endoo-portal-device" })
  if (
    typeof payload.sub      !== "string" ||
    typeof payload.deviceId !== "string" ||
    typeof payload.org      !== "string"
  ) throw new PortalAuthError("Malformed trusted-device token")

  return {
    deviceId: payload.deviceId as string,
    sub:      payload.sub,
    org:      payload.org as string,
  }
}

// ─── portalAuthResponse ──────────────────────────────────────────────────────
// Standardised 401 response for unauthenticated portal requests.

export function portalUnauthorized() {
  return Response.json({ error: "Inte inloggad i kundportalen" }, { status: 401 })
}
