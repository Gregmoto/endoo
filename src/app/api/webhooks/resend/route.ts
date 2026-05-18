import { createHmac, timingSafeEqual } from "crypto"
import { Prisma }          from "@prisma/client"
import { prisma }          from "@/lib/prisma"
import { WEBHOOK_SECRET }  from "@/lib/email/client"

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET) return true  // dev mode

  if (!signature) return false

  // Resend uses: resend-signature: sha256=<hex>
  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

type WebhookEvent = {
  type: string
  data: Record<string, unknown>
}

function appendEvent(
  existing: Prisma.JsonValue,
  entry: { type: string; timestamp: string; data: Record<string, unknown> },
): Prisma.InputJsonValue {
  const arr = Array.isArray(existing) ? (existing as unknown[]) : []
  return [...arr, entry] as unknown as Prisma.InputJsonValue
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text()
  const signature = req.headers.get("resend-signature")

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: WebhookEvent
  try {
    event = JSON.parse(rawBody) as WebhookEvent
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { type, data } = event
  const emailId = data.email_id as string | undefined
  const email   = Array.isArray(data.to) ? (data.to[0] as string) : (data.to as string | undefined)

  if (!emailId) {
    return Response.json({ ok: true })
  }

  const delivery = await prisma.emailDelivery.findFirst({
    where: { providerMessageId: emailId },
  })

  if (!delivery) {
    return Response.json({ ok: true })
  }

  const now = new Date()
  const newEvents = appendEvent(delivery.events, { type, timestamp: now.toISOString(), data })

  switch (type) {
    case "email.sent": {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "sent", events: newEvents },
      })
      break
    }

    case "email.delivered": {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "delivered", deliveredAt: now, events: newEvents },
      })
      break
    }

    case "email.delivery_delayed": {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "delayed", events: newEvents },
      })
      break
    }

    case "email.complained": {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "complained", events: newEvents },
      })
      if (email) {
        await prisma.emailSuppression.upsert({
          where: { organizationId_email: { organizationId: delivery.organizationId, email } },
          create: { organizationId: delivery.organizationId, email, reason: "complained" },
          update: { reason: "complained" },
        })
      }
      break
    }

    case "email.bounced": {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "bounced", bouncedAt: now, events: newEvents },
      })

      const bounceData = data.bounce as Record<string, unknown> | undefined
      if (email && bounceData?.type === "hard") {
        await prisma.emailSuppression.upsert({
          where: { organizationId_email: { organizationId: delivery.organizationId, email } },
          create: { organizationId: delivery.organizationId, email, reason: "bounce_hard" },
          update: { reason: "bounce_hard" },
        })

        const hardBounces = await prisma.emailDelivery.count({
          where: { organizationId: delivery.organizationId, recipientEmail: email, status: "bounced" },
        })
        if (hardBounces >= 2) {
          const contact = await prisma.contact.findFirst({
            where: { organizationId: delivery.organizationId, email, deletedAt: null },
          })
          if (contact) {
            await prisma.contact.update({ where: { id: contact.id }, data: { email: null } })

            prisma.auditLog.create({
              data: {
                organizationId: delivery.organizationId,
                action: "update",
                entityType: "Contact",
                entityId: contact.id,
                meta: { reason: "hard_bounce", clearedEmail: email },
              },
            }).catch((err) => console.error("[webhook/resend] auditLog failed:", err))
          }
        }
      }
      break
    }

    case "email.opened": {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status:   "opened",
          openedAt: delivery.openedAt ?? now,
          events:   newEvents,
        },
      })
      break
    }

    case "email.clicked": {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status:    "clicked",
          clickedAt: delivery.clickedAt ?? now,
          events:    newEvents,
        },
      })
      break
    }

    default: {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { events: newEvents },
      })
    }
  }

  return Response.json({ ok: true })
}
