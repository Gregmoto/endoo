/**
 * GET/POST /api/cron/sign-reminders
 *
 * Runs hourly. Two jobs:
 *  1. Auto-remind pending signers according to request.reminderDays schedule
 *  2. Expire requests that have passed expiresAt
 */

import { prisma }               from "@/lib/prisma"
import { hashToken, signingUrl } from "@/lib/signing/tokens"
import {
  sendSigningReminder,
  sendExpiredNotice,
} from "@/lib/signing/emails"
import crypto from "crypto"

function authorized(req: Request): boolean {
  if (!process.env.CRON_SECRET) return false
  const secret = process.env.CRON_SECRET
  if (req.headers.get("x-cron-secret") === secret) return true
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  let remindsSent = 0
  let expiredCount = 0

  // ── 1. Expire overdue requests ────────────────────────────────────────────

  const toExpire = await prisma.signatureRequest.findMany({
    where: {
      status:    { in: ["sent", "partially_signed"] },
      expiresAt: { lt: now },
    },
    include: {
      createdBy: { select: { email: true } },
    },
  })

  for (const req of toExpire) {
    await prisma.$transaction(async (tx) => {
      await tx.signatureRequest.update({
        where: { id: req.id },
        data:  { status: "expired" },
      })
      await tx.signatureEvent.create({
        data: { signatureRequestId: req.id, eventType: "expired" },
      })
    })
    sendExpiredNotice({ to: req.createdBy.email, documentTitle: req.title })
      .catch(err => console.error("[cron/sign-reminders] expire email", err))
    expiredCount++
  }

  // ── 2. Auto-reminders ─────────────────────────────────────────────────────

  const activeRequests = await prisma.signatureRequest.findMany({
    where: {
      status:    { in: ["sent", "partially_signed"] },
      expiresAt: { gt: now },
    },
    include: {
      signers: true,
      organization: { select: { name: true } },
    },
  })

  for (const sr of activeRequests) {
    const sentAt = sr.createdAt
    const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24))

    // Check if today matches any of the reminder days
    const shouldRemindToday = sr.reminderDays.includes(daysSinceSent)
    if (!shouldRemindToday) continue

    for (const signer of sr.signers) {
      if (signer.role !== "signer") continue
      if (signer.status !== "pending" && signer.status !== "viewed") continue

      // Don't re-send if already reminded today
      if (signer.lastRemindedAt) {
        const hoursSince = (now.getTime() - signer.lastRemindedAt.getTime()) / (1000 * 60 * 60)
        if (hoursSince < 20) continue
      }

      // Rotate token for freshness
      const rawToken  = crypto.randomBytes(32).toString("base64url")
      const tokenHash = hashToken(rawToken)

      await prisma.$transaction(async (tx) => {
        await tx.signer.update({
          where: { id: signer.id },
          data: {
            tokenHash,
            tokenExpiresAt: sr.expiresAt,
            lastRemindedAt: now,
            reminderCount:  { increment: 1 },
          },
        })
        await tx.signatureEvent.create({
          data: {
            signatureRequestId: sr.id,
            signerId:  signer.id,
            eventType: "reminder_sent",
            meta:      { method: "auto", day: daysSinceSent },
          },
        })
      })

      await sendSigningReminder({
        to:            signer.email,
        signerName:    signer.name,
        fromOrgName:   sr.organization.name,
        documentTitle: sr.title,
        signingUrl:    signingUrl(rawToken),
        expiresAt:     sr.expiresAt,
      })
      remindsSent++
    }
  }

  console.log(`[cron/sign-reminders] expired=${expiredCount} remindsSent=${remindsSent}`)
  return Response.json({ expired: expiredCount, remindsSent })
}

export const GET  = handle
export const POST = handle
