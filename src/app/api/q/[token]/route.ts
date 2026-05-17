/**
 * Public quote approval API — no authentication required.
 *
 * GET  /api/q/[token] — return quote info for the approver
 * POST /api/q/[token] — accept or decline the quote
 */

import { prisma }           from "@/lib/prisma"
import { hashToken }        from "@/lib/signing/tokens"
import { sendQuoteAccepted, sendQuoteDeclined } from "@/lib/quotes/emails"
import { z }                from "zod"

function getIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown"
}

async function findQuote(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  return prisma.quote.findFirst({
    where: { approvalTokenHash: tokenHash },
    include: {
      organization: { select: { name: true, contactEmail: true } },
      createdBy:    { select: { email: true } },
    },
  })
}

// ─── GET — return quote context (public) ─────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const quote = await findQuote(token)

  if (!quote) return Response.json({ error: "Länken är ogiltig eller har löpt ut" }, { status: 404 })

  if (quote.approvalTokenExpiresAt && new Date() > quote.approvalTokenExpiresAt) {
    return Response.json({ error: "Länken har löpt ut" }, { status: 410 })
  }
  if (["expired", "cancelled"].includes(quote.status)) {
    return Response.json({ error: "Denna offert är inte längre aktiv" }, { status: 410 })
  }
  if (quote.status === "accepted") {
    return Response.json({ error: "Du har redan godkänt denna offert", alreadyAccepted: true }, { status: 409 })
  }
  if (quote.status === "declined") {
    return Response.json({ error: "Du har redan avböjt denna offert", alreadyDeclined: true }, { status: 409 })
  }

  // Mark as viewed if first time
  if (quote.status === "sent") {
    await prisma.quote.update({
      where: { id: quote.id },
      data:  { status: "viewed", viewedAt: new Date() },
    })
  }

  return Response.json({
    quoteId:     quote.id,
    number:      quote.number,
    title:       quote.title,
    orgName:     quote.organization.name,
    contactName: quote.contactName,
    currency:    quote.currency,
    lineItems:   quote.lineItems,
    notes:       quote.notes,
    terms:       quote.terms,
    validUntil:  quote.validUntil,
    status:      quote.status,
  })
}

// ─── POST — accept or decline ─────────────────────────────────────────────────

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), note: z.string().max(1000).optional() }),
  z.object({ action: z.literal("decline"), note: z.string().max(500).optional() }),
])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const quote = await findQuote(token)

  if (!quote) return Response.json({ error: "Länken är ogiltig" }, { status: 404 })
  if (quote.approvalTokenExpiresAt && new Date() > quote.approvalTokenExpiresAt) {
    return Response.json({ error: "Länken har löpt ut" }, { status: 410 })
  }
  if (!["sent", "viewed"].includes(quote.status)) {
    return Response.json({ error: "Denna offert kan inte längre besvaras" }, { status: 410 })
  }

  const body   = await req.json().catch(() => ({}))
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const now  = new Date()
  const _ip  = getIp(req)
  const note = parsed.data.note ?? null

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  if (parsed.data.action === "accept") {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "accepted", respondedAt: now, responseNote: note },
    })

    const orgRelated = await prisma.organizationMember.findFirst({
      where: { organizationId: quote.organizationId, role: "owner" },
      include: { user: { select: { email: true } } },
    })
    const notifyEmail = orgRelated?.user.email ?? quote.createdBy.email

    sendQuoteAccepted({
      to:          notifyEmail,
      contactName: quote.contactName,
      quoteNumber: quote.number,
      quoteTitle:  quote.title,
      note,
      quoteUrl:    `${baseUrl}/api/quotes/${quote.id}`,
    }).catch(err => console.error("[q/accept] email", err))

    return Response.json({ ok: true, action: "accepted" })
  } else {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "declined", respondedAt: now, responseNote: note },
    })

    sendQuoteDeclined({
      to:          quote.createdBy.email,
      contactName: quote.contactName,
      quoteNumber: quote.number,
      quoteTitle:  quote.title,
      note,
      quoteUrl:    `${baseUrl}/api/quotes/${quote.id}`,
    }).catch(err => console.error("[q/decline] email", err))

    return Response.json({ ok: true, action: "declined" })
  }
}
