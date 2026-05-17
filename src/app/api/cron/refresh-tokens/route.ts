/**
 * GET /api/cron/refresh-tokens
 *
 * Refreshes OAuth2 access tokens that expire within the next 10 minutes.
 *
 * Vercel Cron: every 5 minutes  ("*\/5 * * * *")
 * Authorization: Bearer {CRON_SECRET}
 */

import { prisma }         from "@/lib/prisma"
import { refreshTokens }  from "@/services/integrations/connection"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const soon = new Date(Date.now() + 10 * 60_000)  // expires in < 10 min

    const connections = await prisma.connection.findMany({
      where: {
        status:                "active",
        encryptedRefreshToken: { not: null },
        tokenExpiresAt:        { lte: soon },
      },
      select: { id: true },
    })

    await Promise.allSettled(connections.map((c) => refreshTokens(c.id)))

    return Response.json({ refreshed: connections.length })
  } catch (err) {
    console.error("[cron/refresh-tokens]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
