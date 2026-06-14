/**
 * Public e-signing API — no authentication required.
 *
 * GET  /api/sign/[token] — return signing request info for the signer
 * POST /api/sign/[token] — submit a signature or decline
 */

import { prisma }                from "@/lib/prisma"
import { hashToken }             from "@/lib/signing/tokens"
import {
  sendCompletedNotice,
  sendDeclinedNotice,
  sendPartiallySignedNotice,
} from "@/lib/signing/emails"
import { z } from "zod"

function getIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown"
}

async function findSigner(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  return prisma.signer.findUnique({
    where: { tokenHash },
    include: {
      signatureRequest: {
        include: {
          signers: { orderBy: { signingOrder: "asc" } },
          organization: { select: { name: true, contactEmail: true } },
          createdBy:    { select: { email: true } },
        },
      },
    },
  })
}

// ─── GET — return signing context (public) ────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const signer = await findSigner(token)

  if (!signer) return Response.json({ error: "Länken är ogiltig eller har löpt ut" }, { status: 404 })

  const sr = signer.signatureRequest
  if (new Date() > signer.tokenExpiresAt || sr.status === "expired") {
    return Response.json({ error: "Länken har löpt ut" }, { status: 410 })
  }
  if (["cancelled", "completed", "declined"].includes(sr.status) && signer.status !== "pending") {
    return Response.json({ error: "Denna signeringsbegäran är inte längre aktiv" }, { status: 410 })
  }
  if (signer.status === "signed") {
    return Response.json({ error: "Du har redan signerat detta dokument", alreadySigned: true }, { status: 409 })
  }
  if (signer.status === "declined") {
    return Response.json({ error: "Du har redan avböjt att signera", alreadyDeclined: true }, { status: 409 })
  }

  // Mark as viewed if first time
  if (signer.status === "pending") {
    const ip = getIp(req)
    const ua = req.headers.get("user-agent") ?? ""
    await prisma.$transaction(async (tx) => {
      await tx.signer.update({
        where: { id: signer.id },
        data:  { status: "viewed", viewedAt: new Date(), ipAddress: ip, userAgent: ua },
      })
      await tx.signatureEvent.create({
        data: {
          signatureRequestId: sr.id,
          signerId:  signer.id,
          eventType: "viewed",
          ipAddress: ip,
          userAgent: ua,
        },
      })
    })
  }

  return Response.json({
    requestId:     sr.id,
    title:         sr.title,
    message:       sr.message,
    orgName:       sr.organization.name,
    expiresAt:     sr.expiresAt,
    documentSnapshotUrl: sr.documentSnapshotUrl,
    signerName:    signer.name,
    signerEmail:   signer.email,
    totalSigners:  sr.signers.filter(s => s.role === "signer").length,
    signedCount:   sr.signers.filter(s => s.role === "signer" && s.status === "signed").length,
    requireBankId: sr.requireBankId,
  })
}

// ─── POST — submit signature or decline ───────────────────────────────────────

const signSchema = z.discriminatedUnion("action", [
  z.object({
    action:        z.literal("sign"),
    signatureText: z.string().min(1).max(200),
  }),
  z.object({
    action:        z.literal("decline"),
    reason:        z.string().max(500).optional(),
  }),
])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const signer = await findSigner(token)

  if (!signer) return Response.json({ error: "Länken är ogiltig" }, { status: 404 })

  const sr = signer.signatureRequest
  if (new Date() > signer.tokenExpiresAt) return Response.json({ error: "Länken har löpt ut" }, { status: 410 })
  if (!["sent", "partially_signed"].includes(sr.status)) {
    return Response.json({ error: "Denna signeringsbegäran är inte längre aktiv" }, { status: 410 })
  }
  if (signer.status === "signed")   return Response.json({ error: "Du har redan signerat" }, { status: 409 })
  if (signer.status === "declined") return Response.json({ error: "Du har redan avböjt" }, { status: 409 })

  const body   = await req.json().catch(() => ({}))
  const parsed = signSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const ip = getIp(req)
  const ua = req.headers.get("user-agent") ?? ""
  const now = new Date()

  if (parsed.data.action === "sign") {
    await handleSign(signer, sr, parsed.data.signatureText, ip, ua, now)
    return Response.json({ ok: true, action: "signed" })
  } else {
    await handleDecline(signer, sr, parsed.data.reason ?? null, ip, ua, now)
    return Response.json({ ok: true, action: "declined" })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FullSigner = NonNullable<Awaited<ReturnType<typeof findSigner>>>
type SR = FullSigner["signatureRequest"]

async function handleSign(
  signer: FullSigner, sr: SR,
  signatureText: string, ip: string, ua: string, now: Date,
) {
  await prisma.$transaction(async (tx) => {
    await tx.signer.update({
      where: { id: signer.id },
      data:  { status: "signed", signedAt: now, signatureText, ipAddress: ip, userAgent: ua },
    })
    await tx.signatureEvent.create({
      data: {
        signatureRequestId: sr.id,
        signerId:    signer.id,
        eventType:   "signed",
        ipAddress:   ip,
        userAgent:   ua,
        documentHash: sr.documentHash ?? null,
        meta:        { signatureText },
      },
    })
  })

  // Recount after update
  const allSigners    = sr.signers.filter(s => s.role === "signer")
  const nowSignedIds  = new Set([...allSigners.filter(s => s.status === "signed").map(s => s.id), signer.id])
  const signedCount   = nowSignedIds.size
  const totalSigners  = allSigners.length
  const allDone       = signedCount === totalSigners

  const notifyEmail = sr.createdBy.email

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
        ? { name: signer.name, signedAt: now }
        : { name: s.name, signedAt: s.signedAt }
    )

    // Notify all parties
    const emails = [
      notifyEmail,
      ...allSigners.filter(s => s.id !== signer.id).map(s => s.email),
      ...sr.signers.filter(s => s.role === "cc").map(s => s.email),
    ]
    for (const e of [...new Set(emails)]) {
      sendCompletedNotice({ to: e, documentTitle: sr.title, signers: allSignerDetails })
        .catch(err => console.error("[sign] completed email", err))
    }
  } else {
    await prisma.signatureRequest.update({
      where: { id: sr.id },
      data:  { status: "partially_signed" },
    })
    await prisma.signatureEvent.create({
      data: { signatureRequestId: sr.id, eventType: "partially_signed", meta: { signedCount, totalSigners } },
    })

    const remaining = totalSigners - signedCount
    sendPartiallySignedNotice({
      to:             notifyEmail,
      signerName:     signer.name,
      documentTitle:  sr.title,
      remainingCount: remaining,
    }).catch(err => console.error("[sign] partial email", err))
  }
}

async function handleDecline(
  signer: FullSigner, sr: SR,
  reason: string | null, ip: string, ua: string, now: Date,
) {
  await prisma.$transaction(async (tx) => {
    await tx.signer.update({
      where: { id: signer.id },
      data:  { status: "declined", declinedAt: now, declineReason: reason, ipAddress: ip, userAgent: ua },
    })
    await tx.signatureRequest.update({
      where: { id: sr.id },
      data:  { status: "declined" },
    })
    await tx.signatureEvent.create({
      data: {
        signatureRequestId: sr.id,
        signerId:  signer.id,
        eventType: "declined",
        ipAddress: ip,
        userAgent: ua,
        meta:      { reason },
      },
    })
  })

  sendDeclinedNotice({
    to:            sr.createdBy.email,
    signerName:    signer.name,
    documentTitle: sr.title,
    reason,
  }).catch(err => console.error("[sign] decline email", err))
}
