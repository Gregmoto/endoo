/**
 * POST /api/signatures — create a new signature request
 * GET  /api/signatures?entityType=...&entityId=... — list requests for an entity
 */

import { prisma }                from "@/lib/prisma"
import { requireAuth }           from "@/lib/rbac/guards"
import { canOrThrow }            from "@/lib/rbac/policy"
import { generateSignerToken, signingUrl } from "@/lib/signing/tokens"
import { sendSigningInvite }     from "@/lib/signing/emails"
import { z }                     from "zod"

const signerSchema = z.object({
  name:  z.string().min(1).max(200),
  email: z.string().email(),
  role:  z.enum(["signer", "cc"]).default("signer"),
})

const createSchema = z.object({
  entityType:    z.enum(["contract", "quote"]),
  entityId:      z.string().uuid(),
  title:         z.string().min(1).max(300),
  message:       z.string().max(2000).nullable().optional(),
  expiresAt:     z.string().datetime().optional(),
  requireBankId: z.boolean().default(false),
  signers:       z.array(signerSchema).min(1).max(20),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "signatures:create")
    canOrThrow(ctx, "signatures:send")

    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

    const { entityType, entityId, title, message, signers, requireBankId } = parsed.data
    const expiresAt = parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default

    // Verify entity belongs to this org
    if (entityType === "contract") {
      const schedule = await prisma.recurringSchedule.findFirst({
        where: { id: entityId, organizationId: ctx.organizationId, deletedAt: null },
      })
      if (!schedule) return Response.json({ error: "Avtalet hittades ej" }, { status: 404 })
    } else {
      const invoice = await prisma.invoice.findFirst({
        where: { id: entityId, organizationId: ctx.organizationId, deletedAt: null, type: "quote" },
      })
      if (!invoice) return Response.json({ error: "Offerten hittades ej" }, { status: 404 })
    }

    // Generate tokens and create everything in one transaction
    const signerTokens = signers.map(() => generateSignerToken())

    const request = await prisma.$transaction(async (tx) => {
      const req = await tx.signatureRequest.create({
        data: {
          organizationId:  ctx.organizationId,
          entityType,
          entityId,
          title,
          message:         message ?? null,
          expiresAt,
          requireBankId:   requireBankId ?? false,
          status:          "sent",
          createdByUserId: ctx.userId,
        },
      })

      await tx.signer.createMany({
        data: signers.map((s, i) => ({
          signatureRequestId: req.id,
          name:          s.name,
          email:         s.email,
          role:          s.role,
          signingOrder:  i,
          tokenHash:     signerTokens[i].tokenHash,
          tokenExpiresAt: expiresAt,
        })),
      })

      await tx.signatureEvent.create({
        data: {
          signatureRequestId: req.id,
          eventType: "created",
          meta: { title, signerCount: signers.length },
        },
      })

      await tx.signatureEvent.create({
        data: {
          signatureRequestId: req.id,
          eventType: "sent",
          meta: { signerCount: signers.length },
        },
      })

      return req
    })

    // Fetch org name for emails
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true },
    })

    // Send invite emails (fire-and-forget, don't block response)
    const actualSigners = signers.filter(s => s.role === "signer")
    for (let i = 0; i < actualSigners.length; i++) {
      const signer = actualSigners[i]
      const token  = signerTokens[signers.indexOf(signer)]
      sendSigningInvite({
        to:            signer.email,
        signerName:    signer.name,
        fromOrgName:   org?.name ?? "Endoo",
        documentTitle: title,
        message:       message ?? null,
        signingUrl:    signingUrl(token.rawToken),
        expiresAt,
      }).catch(err => console.error("[signatures] invite email failed", err))
    }

    return Response.json({ id: request.id, status: request.status }, { status: 201 })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[signatures POST]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "signatures:read")

    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get("entityType")
    const entityId   = searchParams.get("entityId")

    const requests = await prisma.signatureRequest.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(entityType ? { entityType } : {}),
        ...(entityId   ? { entityId }   : {}),
      },
      include: {
        signers: {
          select: {
            id: true, name: true, email: true, role: true,
            status: true, viewedAt: true, signedAt: true, declinedAt: true,
            reminderCount: true, lastRemindedAt: true,
          },
          orderBy: { signingOrder: "asc" },
        },
        _count: { select: { signers: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({ requests })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
