/**
 * Cron: expire stale quotes.
 * Runs daily — marks sent/viewed quotes as expired when validUntil has passed.
 */

import { prisma } from "@/lib/prisma"
import { sendQuoteExpired } from "@/lib/quotes/emails"

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Find all sent/viewed quotes past their validUntil
  const stale = await prisma.quote.findMany({
    where: {
      status:    { in: ["sent", "viewed"] },
      validUntil: { lt: now },
    },
    include: {
      createdBy: { select: { email: true } },
    },
  })

  if (stale.length === 0) {
    return Response.json({ ok: true, expired: 0 })
  }

  // Bulk update to expired
  await prisma.quote.updateMany({
    where: { id: { in: stale.map(q => q.id) } },
    data:  { status: "expired" },
  })

  // Notify creators (fire-and-forget)
  for (const q of stale) {
    sendQuoteExpired({
      to:          q.createdBy.email,
      quoteNumber: q.number,
      quoteTitle:  q.title,
    }).catch(err => console.error("[cron/quotes] expire email", err))
  }

  console.log(`[cron/quotes] expired ${stale.length} quotes`)
  return Response.json({ ok: true, expired: stale.length })
}
