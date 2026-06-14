/**
 * GET /api/sign/[token]/bankid/callback?code=...&state=...
 *
 * Criipto redirects here after the user completes BankID authentication.
 * We:
 *   1. Verify the state param matches the cookie nonce
 *   2. Exchange the authorization code for an ID token
 *   3. Extract BankID claims (personnummer, name, transaction ID, cert)
 *   4. Persist claims to the Signer row + mark as signed
 *   5. Create a SignatureEvent with full BankID evidence
 *   6. Update SignatureRequest status (partially_signed / completed)
 *   7. Redirect to /sign/[token]?bankid=done
 */

import { NextResponse }         from "next/server"
import { cookies }              from "next/headers"
import { prisma }               from "@/lib/prisma"
import { hashToken }            from "@/lib/signing/tokens"
import { exchangeCode }         from "@/lib/signing/criipto"
import {
  sendCompletedNotice,
  sendPartiallySignedNotice,
} from "@/lib/signing/emails"

const APP_BASE = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://app.endoo.se"

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, APP_BASE))
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const url       = new URL(req.url)
  const code      = url.searchParams.get("code")
  const state     = url.searchParams.get("state")
  const errorParm = url.searchParams.get("error")

  if (errorParm) {
    const desc = url.searchParams.get("error_description") ?? errorParm
    console.error("[bankid/callback] Criipto error:", desc)
    return redirect(`/sign/${token}?bankid=error&reason=${encodeURIComponent(desc)}`)
  }

  if (!code || !state) {
    return redirect(`/sign/${token}?bankid=error&reason=missing_params`)
  }

  // Verify nonce
  const jar         = await cookies()
  const cookieNonce = jar.get(`bankid_nonce_${token}`)?.value
  if (!cookieNonce) {
    return redirect(`/sign/${token}?bankid=error&reason=session_expired`)
  }

  let statePayload: { token: string; nonce: string }
  try {
    statePayload = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"))
  } catch {
    return redirect(`/sign/${token}?bankid=error&reason=invalid_state`)
  }

  if (statePayload.nonce !== cookieNonce || statePayload.token !== token) {
    return redirect(`/sign/${token}?bankid=error&reason=nonce_mismatch`)
  }

  // Clear nonce cookie
  jar.delete(`bankid_nonce_${token}`)

  // Validate token + signer
  const tokenHash = hashToken(token)
  const signer = await prisma.signer.findUnique({
    where: { tokenHash },
    include: {
      signatureRequest: {
        include: {
          signers:      { orderBy: { signingOrder: "asc" } },
          organization: { select: { name: true } },
          createdBy:    { select: { email: true } },
        },
      },
    },
  })

  if (!signer) return redirect(`/sign/${token}?bankid=error&reason=not_found`)
  if (signer.status === "signed") return redirect(`/sign/${token}?bankid=done`)
  if (new Date() > signer.tokenExpiresAt) {
    return redirect(`/sign/${token}?bankid=error&reason=expired`)
  }

  const sr  = signer.signatureRequest
  const now = new Date()

  // Exchange code for claims
  let claims
  try {
    claims = await exchangeCode(token, code)
  } catch (err) {
    console.error("[bankid/callback] token exchange failed:", err)
    return redirect(`/sign/${token}?bankid=error&reason=exchange_failed`)
  }

  // Persist BankID evidence + mark signer as signed
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const ua = req.headers.get("user-agent") ?? ""

  await prisma.$transaction(async (tx) => {
    await tx.signer.update({
      where: { id: signer.id },
      data: {
        status:             "signed",
        signedAt:           now,
        signatureText:      claims.name,      // display name as canonical "signature"
        ipAddress:          ip,
        userAgent:          ua,
        bankIdPersonnummer: claims.ssn,
        bankIdName:         claims.name,
        bankIdTransactionId: claims.transactionId ?? null,
        bankIdCertificate:  JSON.stringify({
          notBefore: claims.certNotBefore,
          notAfter:  claims.certNotAfter,
        }),
        bankIdCompletedAt:  now,
      },
    })

    // Ensure viewed is recorded if this is the first touch
    if (signer.status === "pending") {
      await tx.signatureEvent.create({
        data: {
          signatureRequestId: sr.id,
          signerId:  signer.id,
          eventType: "viewed",
          ipAddress: ip,
          userAgent: ua,
        },
      })
    }

    await tx.signatureEvent.create({
      data: {
        signatureRequestId: sr.id,
        signerId:    signer.id,
        eventType:   "signed",
        ipAddress:   ip,
        userAgent:   ua,
        documentHash: sr.documentHash ?? null,
        meta: {
          method:          "bankid",
          personnummer:    claims.ssn,
          name:            claims.name,
          transactionId:   claims.transactionId,
          certNotBefore:   claims.certNotBefore,
          certNotAfter:    claims.certNotAfter,
        },
      },
    })
  })

  // Update signature request status
  const allSigners   = sr.signers.filter(s => s.role === "signer")
  const nowSignedIds = new Set([...allSigners.filter(s => s.status === "signed").map(s => s.id), signer.id])
  const signedCount  = nowSignedIds.size
  const totalSigners = allSigners.length
  const allDone      = signedCount === totalSigners
  const notifyEmail  = sr.createdBy.email

  if (allDone) {
    await prisma.$transaction(async (tx) => {
      await tx.signatureRequest.update({
        where: { id: sr.id },
        data:  { status: "completed", completedAt: now },
      })
      await tx.signatureEvent.create({
        data: { signatureRequestId: sr.id, eventType: "completed" },
      })
    })

    const allSignerDetails = allSigners.map(s =>
      s.id === signer.id
        ? { name: claims.name, signedAt: now }
        : { name: s.name,      signedAt: s.signedAt }
    )
    const emails = [
      notifyEmail,
      ...allSigners.filter(s => s.id !== signer.id).map(s => s.email),
      ...sr.signers.filter(s => s.role === "cc").map(s => s.email),
    ]
    for (const e of [...new Set(emails)]) {
      sendCompletedNotice({ to: e, documentTitle: sr.title, signers: allSignerDetails })
        .catch(err => console.error("[bankid/callback] completed email", err))
    }
  } else {
    await prisma.signatureRequest.update({
      where: { id: sr.id },
      data:  { status: "partially_signed" },
    })
    await prisma.signatureEvent.create({
      data: { signatureRequestId: sr.id, eventType: "partially_signed", meta: { signedCount, totalSigners } },
    })

    sendPartiallySignedNotice({
      to:             notifyEmail,
      signerName:     claims.name,
      documentTitle:  sr.title,
      remainingCount: totalSigners - signedCount,
    }).catch(err => console.error("[bankid/callback] partial email", err))
  }

  return redirect(`/sign/${token}?bankid=done`)
}
