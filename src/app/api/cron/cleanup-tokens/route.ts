/**
 * GET /api/cron/cleanup-tokens
 * Daily cleanup of expired tokens and stale records.
 *
 * Vercel Cron: 0 4 * * * (04:00 UTC daily)
 *
 * Deletes:
 *   - PortalMagicToken expired > 7 days ago
 *   - PortalAuthAttempt older than 90 days
 *   - TrustedDevice revoked more than 30 days ago
 *   - EmailSuppression transient (bounce_soft/unsubscribed) older than 90 days
 */

import { prisma } from "@/lib/prisma"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now      = new Date()
    const days7    = new Date(now.getTime() - 7  * 24 * 60 * 60_000)
    const days30   = new Date(now.getTime() - 30 * 24 * 60 * 60_000)
    const days90   = new Date(now.getTime() - 90 * 24 * 60 * 60_000)

    const [tokens, attempts, devices, suppressions] = await Promise.all([
      prisma.portalMagicToken.deleteMany({
        where: { expiresAt: { lt: days7 } },
      }),
      prisma.portalAuthAttempt.deleteMany({
        where: { createdAt: { lt: days90 } },
      }),
      prisma.trustedDevice.deleteMany({
        where: { revokedAt: { lt: days30 } },
      }),
      prisma.emailSuppression.deleteMany({
        where: {
          reason:    { in: ["bounce_soft", "unsubscribed"] },
          createdAt: { lt: days90 },
        },
      }),
    ])

    return Response.json({
      ok: true,
      deleted: {
        portalMagicTokens:  tokens.count,
        portalAuthAttempts: attempts.count,
        trustedDevices:     devices.count,
        emailSuppressions:  suppressions.count,
      },
    })
  } catch (err) {
    console.error("[cron/cleanup-tokens]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
