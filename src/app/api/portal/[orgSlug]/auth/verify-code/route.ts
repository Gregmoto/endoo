/**
 * POST /api/portal/[orgSlug]/auth/verify-code
 * Validate the 6-digit security code after an IP-mismatch challenge.
 * On success: marks token used, issues portal session, redirects to portal home.
 */

import { prisma }        from "@/lib/prisma"
import { hashToken }     from "@/lib/signing/tokens"
import {
  signPortalJwt,
  PORTAL_COOKIE,
  COOKIE_OPTIONS,
  getClientIp,
} from "@/lib/portal/auth"
import { cookies }       from "next/headers"
import { NextResponse }  from "next/server"
import crypto            from "crypto"
import { z }             from "zod"

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

const Body = z.object({
  token: z.string().min(1),
  code:  z.string().length(6).regex(/^\d{6}$/),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params

  const body   = await req.json().catch(() => ({}))
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
  }

  const { token: rawToken, code } = parsed.data
  const ip        = getClientIp(req)
  const userAgent = req.headers.get("user-agent") ?? "unknown"

  const tokenHash = hashToken(rawToken)
  const magic = await prisma.portalMagicToken.findUnique({
    where:  { tokenHash },
    select: {
      id: true, contactId: true, organizationId: true, email: true,
      expiresAt: true, usedAt: true, pendingCode: true,
    },
  })

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

  if (!magic || !magic.pendingCode) {
    await logAttempt(false, "code_no_challenge")
    return Response.json({ error: "Ingen aktiv utmaning hittades" }, { status: 400 })
  }
  if (magic.usedAt) {
    await logAttempt(false, "token_reused")
    return Response.json({ error: "Länken har redan använts" }, { status: 400 })
  }
  if (magic.expiresAt < new Date()) {
    await logAttempt(false, "token_expired")
    return Response.json({ error: "Länken har gått ut" }, { status: 400 })
  }

  // Verify code
  const codeHash = crypto.createHash("sha256").update(code).digest("hex")
  if (codeHash !== magic.pendingCode) {
    await logAttempt(false, "code_wrong")
    return Response.json({ error: "Felaktig kod" }, { status: 401 })
  }

  // Verify org slug
  const org = await prisma.organization.findUnique({
    where:  { id: magic.organizationId },
    select: { id: true, slug: true },
  })
  if (!org || org.slug !== orgSlug) {
    await logAttempt(false, "org_mismatch")
    return Response.json({ error: "Ogiltig länk" }, { status: 400 })
  }

  // Mark token used
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

  await logAttempt(true)

  return Response.json({ ok: true, redirect: `${BASE_URL}/portal/${orgSlug}` })
}
