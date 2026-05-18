/**
 * POST /api/portal/[orgSlug]/auth/send
 * Send a magic-link login email to a known contact.
 */

import { prisma }               from "@/lib/prisma"
import { generateSignerToken }  from "@/lib/signing/tokens"
import { sendPortalMagicLink }  from "@/lib/portal/emails"
import { resolveBranding }      from "@/lib/branding/resolver"
import { apiOk }                from "@/lib/api/response"
import { z }                    from "zod"

const EXPIRES_MINUTES = 10
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

const Body = z.object({ email: z.string().email() })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params

  const body   = await req.json().catch(() => ({}))
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Ogiltig e-postadress" }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase().trim()

  // Look up org
  const org = await prisma.organization.findUnique({
    where:  { slug: orgSlug },
    select: { id: true, name: true },
  })
  if (!org) return Response.json({ error: "Organisation hittades inte" }, { status: 404 })

  // Look up contact by email in this org
  const contact = await prisma.contact.findFirst({
    where: { organizationId: org.id, email, isArchived: false },
    select: { id: true, name: true },
  })

  // Always return 200 to prevent email enumeration
  if (!contact) {
    return apiOk({ ok: true })
  }

  // Generate token
  const { rawToken, tokenHash } = generateSignerToken()
  const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60_000)

  await prisma.portalMagicToken.create({
    data: {
      organizationId: org.id,
      contactId:      contact.id,
      email,
      tokenHash,
      expiresAt,
    },
  })

  const branding  = await resolveBranding(org.id)
  const loginUrl  = `${BASE_URL}/api/portal/${orgSlug}/auth/verify?token=${rawToken}`

  sendPortalMagicLink({
    to:          email,
    contactName: contact.name,
    orgName:     branding.displayName ?? org.name,
    loginUrl,
    expiresMinutes: EXPIRES_MINUTES,
    color:       branding.primaryColor,
  }).catch(err => console.error("[portal/auth/send] email", err))

  return apiOk({ ok: true })
}
