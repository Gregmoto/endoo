/**
 * POST /api/webhooks/[slug]
 *
 * Universal webhook ingestion endpoint.
 * Returns 200 immediately; async processing happens via cron.
 *
 * Query param: connectionId — required to look up the connection and secret.
 * E.g. /api/webhooks/stripe?connectionId=<uuid>
 */

import { prisma }       from "@/lib/prisma"
import { getConnector } from "@/lib/integrations/registry"
import { decryptNullable } from "@/lib/integrations/encryption"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug }     = await params
  const url          = new URL(req.url)
  const connectionId = url.searchParams.get("connectionId")

  if (!connectionId) {
    return Response.json({ error: "connectionId krävs" }, { status: 400 })
  }

  // Read raw body for signature verification
  const rawBody = Buffer.from(await req.arrayBuffer())
  const headers = Object.fromEntries(req.headers.entries())

  const connection = await prisma.connection.findUnique({
    where:  { id: connectionId },
    select: { id: true, organizationId: true, integrationSlug: true, webhookSecret: true, encryptionIv: true, status: true },
  })

  if (!connection || connection.integrationSlug !== slug || connection.status === "disconnected") {
    // Return 200 to avoid leaking existence info
    return new Response(null, { status: 200 })
  }

  const connector = getConnector(slug)
  if (!connector.verifyWebhook) {
    return new Response(null, { status: 200 })
  }

  // Decrypt webhook secret
  const secret = connection.webhookSecret && connection.encryptionIv
    ? (decryptNullable(connection.webhookSecret, connection.encryptionIv) ?? "")
    : ""

  const verification = connector.verifyWebhook(rawBody, headers, secret)

  const eventId    = verification.eventId || null
  const rawPayload = verification.payload ?? JSON.parse(rawBody.toString("utf8"))

  // Idempotent insert — UNIQUE(connectionId, externalEventId) prevents duplicates
  if (eventId) {
    await prisma.webhookEvent.upsert({
      where: { connectionId_externalEventId: { connectionId: connection.id, externalEventId: eventId } },
      create: {
        connectionId:    connection.id,
        organizationId:  connection.organizationId,
        topic:           verification.topic,
        externalEventId: eventId,
        rawPayload,
        signatureValid:  verification.valid,
        status:          verification.valid ? "pending" : "failed",
        errorMessage:    verification.valid ? null : "Invalid signature",
      },
      update: {},  // already stored — skip
    }).catch(() => {})  // P2002 race — fine, already stored
  } else {
    // No event ID — always create (can't dedup)
    await prisma.webhookEvent.create({
      data: {
        connectionId:    connection.id,
        organizationId:  connection.organizationId,
        topic:           verification.topic || "unknown",
        rawPayload,
        signatureValid:  verification.valid,
        status:          verification.valid ? "pending" : "failed",
        errorMessage:    verification.valid ? null : "Invalid signature",
      },
    }).catch(() => {})
  }

  // Always return 200 to prevent retries from external systems
  return new Response(null, { status: 200 })
}
