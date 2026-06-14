/**
 * GET /api/sign/[token]/bankid/initiate
 *
 * Validates the signing token, generates a nonce (stored in a short-lived
 * cookie), and redirects the user to Criipto's BankID authorization endpoint.
 */

import { NextResponse }         from "next/server"
import { cookies }              from "next/headers"
import { prisma }               from "@/lib/prisma"
import { hashToken }            from "@/lib/signing/tokens"
import { buildAuthUrl, generateNonce } from "@/lib/signing/criipto"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Validate token
  const tokenHash = hashToken(token)
  const signer = await prisma.signer.findUnique({
    where: { tokenHash },
    include: { signatureRequest: { select: { status: true, requireBankId: true } } },
  })

  if (!signer) {
    return new Response("Ogiltig länk", { status: 404 })
  }
  if (!signer.signatureRequest.requireBankId) {
    return new Response("BankID krävs inte för detta dokument", { status: 400 })
  }
  if (new Date() > signer.tokenExpiresAt) {
    return new Response("Länken har löpt ut", { status: 410 })
  }
  if (!["sent", "partially_signed"].includes(signer.signatureRequest.status)) {
    return new Response("Signeringsbegäran är inte längre aktiv", { status: 410 })
  }
  if (signer.status === "signed") {
    return NextResponse.redirect(new URL(`/sign/${token}`, process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://app.endoo.se"))
  }

  const nonce   = generateNonce()
  const authUrl = buildAuthUrl(token, nonce)

  // Store nonce in cookie so callback can verify (30 min TTL)
  const jar = await cookies()
  jar.set(`bankid_nonce_${token}`, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   30 * 60,
    path:     "/",
  })

  return NextResponse.redirect(authUrl)
}
