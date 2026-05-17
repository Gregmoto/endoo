/**
 * POST /api/signatures/[id]/remind
 * Manual reminder — sends email to all pending signers.
 * Rate-limited to 1 per signer per 24h.
 */

import { prisma }               from "@/lib/prisma"
import { requireAuth }          from "@/lib/rbac/guards"
import { canOrThrow }           from "@/lib/rbac/policy"
import { hashToken, signingUrl } from "@/lib/signing/tokens"
import { sendSigningReminder }  from "@/lib/signing/emails"
import crypto                   from "crypto"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "signatures:remind")
    const { id } = await params

    const request = await prisma.signatureRequest.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { signers: true },
    })
    if (!request) return Response.json({ error: "Hittades ej" }, { status: 404 })
    if (!["sent", "partially_signed"].includes(request.status)) {
      return Response.json({ error: "Kan ej skicka påminnelse i nuvarande status" }, { status: 422 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true },
    })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let sent = 0

    for (const signer of request.signers) {
      if (signer.role !== "signer") continue
      if (signer.status !== "pending" && signer.status !== "viewed") continue
      if (signer.lastRemindedAt && signer.lastRemindedAt > twentyFourHoursAgo) continue

      // Generate a fresh token for this signer (the old one may be compromised)
      const rawToken = crypto.randomBytes(32).toString("base64url")
      const tokenHash = hashToken(rawToken)

      await prisma.$transaction(async (tx) => {
        await tx.signer.update({
          where: { id: signer.id },
          data: {
            tokenHash,
            tokenExpiresAt: request.expiresAt,
            lastRemindedAt: new Date(),
            reminderCount: { increment: 1 },
          },
        })
        await tx.signatureEvent.create({
          data: {
            signatureRequestId: id,
            signerId:           signer.id,
            eventType:          "reminder_sent",
            meta:               { method: "manual" },
          },
        })
      })

      await sendSigningReminder({
        to:            signer.email,
        signerName:    signer.name,
        fromOrgName:   org?.name ?? "Endoo",
        documentTitle: request.title,
        signingUrl:    signingUrl(rawToken),
        expiresAt:     request.expiresAt,
      })
      sent++
    }

    return Response.json({ sent })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[signatures/remind]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
