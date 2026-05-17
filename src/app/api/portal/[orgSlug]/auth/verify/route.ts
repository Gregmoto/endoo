/**
 * GET /api/portal/[orgSlug]/auth/verify?token=RAW_TOKEN
 * Verify a magic-link token, issue a portal session cookie, redirect to portal home.
 */

import { prisma }          from "@/lib/prisma"
import { hashToken }       from "@/lib/signing/tokens"
import { signPortalJwt, PORTAL_COOKIE, COOKIE_OPTIONS } from "@/lib/portal/auth"
import { cookies }         from "next/headers"
import { NextResponse }    from "next/server"

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

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

  const tokenHash = hashToken(rawToken)

  const magic = await prisma.portalMagicToken.findUnique({
    where:  { tokenHash },
    select: { id: true, contactId: true, organizationId: true, email: true, expiresAt: true, usedAt: true },
  })

  if (!magic)                         return fail("Länken är ogiltig")
  if (magic.usedAt)                   return fail("Länken har redan använts")
  if (magic.expiresAt < new Date())   return fail("Länken har gått ut")

  // Verify org slug matches
  const org = await prisma.organization.findUnique({
    where:  { id: magic.organizationId },
    select: { id: true, slug: true },
  })
  if (!org || org.slug !== orgSlug)   return fail("Ogiltig länk")

  // Mark as used
  await prisma.portalMagicToken.update({
    where: { id: magic.id },
    data:  { usedAt: new Date() },
  })

  const jwt = await signPortalJwt({
    sub:   magic.contactId,
    org:   magic.organizationId,
    email: magic.email,
  })

  const cookieStore = await cookies()
  cookieStore.set(PORTAL_COOKIE, jwt, COOKIE_OPTIONS)

  return NextResponse.redirect(`${BASE_URL}/portal/${orgSlug}`)
}
