/**
 * POST /api/quotes/[id]/send
 * Generate an approval token, send email to contact, set status=sent.
 */

import { prisma }          from "@/lib/prisma"
import { requireAuth }     from "@/lib/rbac/guards"
import { canOrThrow }      from "@/lib/rbac/policy"
import { generateSignerToken } from "@/lib/signing/tokens"
import { sendQuoteInvite } from "@/lib/quotes/emails"

function approvalUrl(rawToken: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  return `${base}/q/${rawToken}`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "quotes:send")
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { organization: { select: { name: true, contactEmail: true } } },
    })
    if (!quote) return Response.json({ error: "Hittades inte" }, { status: 404 })
    if (!["draft", "sent"].includes(quote.status)) {
      return Response.json({ error: "Kan bara skicka utkast eller redan skickad offert" }, { status: 422 })
    }
    if (!quote.contactEmail) {
      return Response.json({ error: "Kontakten saknar e-postadress" }, { status: 422 })
    }

    const body = await req.json().catch(() => ({}))
    const validDays: number = body.validDays && typeof body.validDays === "number" ? body.validDays : 30

    // Generate approval token — same pattern as e-signing
    const { rawToken, tokenHash } = generateSignerToken()
    const tokenExpires = new Date(Date.now() + validDays * 86_400_000)
    const validUntil   = quote.validUntil ?? tokenExpires

    await prisma.quote.update({
      where: { id },
      data: {
        status:                "sent",
        sentAt:                new Date(),
        approvalTokenHash:     tokenHash,
        approvalTokenExpiresAt: tokenExpires,
        validUntil,
      },
    })

    sendQuoteInvite({
      to:          quote.contactEmail,
      contactName: quote.contactName,
      fromOrgName: quote.organization.name,
      quoteNumber: quote.number,
      quoteTitle:  quote.title,
      message:     quote.notes,
      approvalUrl: approvalUrl(rawToken),
      validUntil,
    }).catch(err => console.error("[quotes/send] email", err))

    return Response.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[quotes/send]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
