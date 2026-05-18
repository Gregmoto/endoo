/**
 * GET  /api/portal/[orgSlug]/sessions — list trusted devices for the contact
 * POST /api/portal/[orgSlug]/sessions — trust the current device
 */

import { prisma }       from "@/lib/prisma"
import { apiOk }        from "@/lib/api/response"
import {
  requirePortalAuth,
  portalUnauthorized,
  getClientIp,
  ipPrefix,
  signTrustedDeviceJwt,
  TRUSTED_DEVICE_COOKIE,
  TRUSTED_DEVICE_COOKIE_OPTIONS,
} from "@/lib/portal/auth"
import { PortalAuthError } from "@/lib/portal/auth"
import { cookies }         from "next/headers"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try {
    claims = await requirePortalAuth(orgSlug)
  } catch (e) {
    if (e instanceof PortalAuthError) return portalUnauthorized()
    throw e
  }

  const devices = await prisma.trustedDevice.findMany({
    where:   { organizationId: claims.orgId, contactId: claims.sub, revokedAt: null },
    select:  { id: true, deviceId: true, label: true, ipPrefix: true, userAgent: true, lastUsedAt: true, createdAt: true },
    orderBy: { lastUsedAt: "desc" },
  })

  return apiOk({ devices })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try {
    claims = await requirePortalAuth(orgSlug)
  } catch (e) {
    if (e instanceof PortalAuthError) return portalUnauthorized()
    throw e
  }

  const ip        = getClientIp(req)
  const userAgent = req.headers.get("user-agent") ?? "unknown"
  const body      = await req.json().catch(() => ({}))
  const label     = typeof body?.label === "string" ? body.label.slice(0, 100) : null

  const device = await prisma.trustedDevice.create({
    data: {
      organizationId: claims.orgId,
      contactId:      claims.sub,
      ipPrefix:       ipPrefix(ip),
      userAgent,
      label,
    },
    select: { deviceId: true },
  })

  const jwt = await signTrustedDeviceJwt({
    deviceId: device.deviceId,
    sub:      claims.sub,
    org:      claims.orgId,
  })

  const cookieStore = await cookies()
  cookieStore.set(TRUSTED_DEVICE_COOKIE, jwt, TRUSTED_DEVICE_COOKIE_OPTIONS)

  return apiOk({ ok: true, deviceId: device.deviceId })
}
