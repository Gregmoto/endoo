/**
 * dispatchEvent — single entry point for all notification events.
 *
 * Algorithm:
 *   1. Validate event type exists in registry
 *   2. Compute deterministic fingerprint
 *   3. INSERT event ON CONFLICT DO NOTHING (idempotent)
 *   4. If already exists → return early (retry-safe)
 *   5. Write ActivityFeedItem (org stream)
 *   6. Resolve recipients, batch-load preferences
 *   7. Write Notification rows (in-app inbox) + NotificationJob rows (email queue)
 *
 * Designed for fire-and-forget usage after a business transaction commits:
 *   dispatchEvent({...}).catch(err => console.error("[notify]", err))
 */

import { prisma }                  from "@/lib/prisma"
import { Prisma }                  from "@prisma/client"
import { computeEventFingerprint } from "./fingerprint"
import { getPreferencesBatch }     from "./preferences"
import { EVENT_REGISTRY }          from "./registry"
import type { EventInput, BaseEventPayload } from "./types"

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  )
}

export async function dispatchEvent<P extends BaseEventPayload>(
  input: EventInput<P>,
): Promise<void> {
  const def = EVENT_REGISTRY[input.type]
  if (!def) {
    console.warn("[notify] Unknown event type:", input.type)
    return
  }

  // ── 1. Compute fingerprint ────────────────────────────────────────────────
  const fingerprint = computeEventFingerprint({
    organizationId: input.organizationId,
    type:           input.type,
    entityId:       input.entityId,
    window:         def.fingerprint(input.payload),
  })

  // ── 2. Write event (idempotent) ───────────────────────────────────────────
  let event: { id: string }
  try {
    event = await prisma.notificationEvent.create({
      data: {
        organizationId:   input.organizationId,
        type:             input.type,
        actorUserId:      input.actorUserId ?? null,
        entityType:       input.entityType,
        entityId:         input.entityId,
        payload:          input.payload as unknown as Prisma.InputJsonValue,
        eventFingerprint: fingerprint,
      },
      select: { id: true },
    })
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      // Already dispatched — idempotent, nothing to do
      return
    }
    throw err
  }

  const payload = input.payload

  // ── 3. Write activity feed item ───────────────────────────────────────────
  prisma.activityFeedItem.create({
    data: {
      organizationId: input.organizationId,
      eventId:        event.id,
      actorUserId:    input.actorUserId ?? null,
      entityType:     input.entityType,
      entityId:       input.entityId,
      title:          payload.displayTitle,
      body:           payload.displaySubtitle ?? null,
      href:           payload.href,
      iconKey:        def.activityIcon,
      category:       def.category,
    },
  }).catch((err) => console.error("[notify:feed]", err))

  // ── 4. Resolve recipients ─────────────────────────────────────────────────
  let recipients: Array<{ userId: string; reason: string }>
  try {
    recipients = await def.resolveRecipients(input.organizationId, payload)
  } catch (err) {
    console.error("[notify:recipients]", err)
    return
  }

  if (recipients.length === 0) return

  // Exclude actor from their own notifications
  const effectiveRecipients = input.actorUserId
    ? recipients.filter((r) => r.userId !== input.actorUserId)
    : recipients

  if (effectiveRecipients.length === 0) return

  // ── 5. Batch-load preferences ─────────────────────────────────────────────
  const prefMap = await getPreferencesBatch(
    effectiveRecipients,
    input.organizationId,
    def.category,
  )

  // ── 6. Write inbox + email jobs ───────────────────────────────────────────
  for (const recipient of effectiveRecipients) {
    const prefs = prefMap.get(recipient.userId) ?? {
      inApp: def.defaultInApp,
      email: def.defaultEmail,
      emailDigest: false,
    }

    if (!prefs.inApp && !prefs.email) continue

    let notificationId: string | null = null

    // In-app notification
    if (prefs.inApp) {
      try {
        const notif = await prisma.notification.create({
          data: {
            organizationId: input.organizationId,
            userId:         recipient.userId,
            eventId:        event.id,
            title:          payload.displayTitle,
            body:           payload.displaySubtitle ?? null,
            href:           payload.href,
            iconKey:        def.activityIcon,
            category:       def.category,
          },
          select: { id: true },
        })
        notificationId = notif.id
      } catch (err) {
        if (!isPrismaUniqueViolation(err)) {
          console.error("[notify:inbox]", err)
        }
        // If unique violation, notification already exists — still enqueue email below
        if (!isPrismaUniqueViolation(err)) continue
      }
    }

    // Email job
    if (prefs.email && def.emailTemplate) {
      try {
        // Enrich payload with user id for template rendering
        const jobPayload = { ...payload, _recipientUserId: recipient.userId }
        await prisma.notificationJob.create({
          data: {
            organizationId: input.organizationId,
            userId:         recipient.userId,
            notificationId: notificationId ?? undefined,
            channel:        "email",
            template:       def.emailTemplate,
            payload:        jobPayload as unknown as Prisma.InputJsonValue,
            status:         "pending",
            nextAttemptAt:  new Date(),
          },
        })
      } catch (err) {
        if (!isPrismaUniqueViolation(err)) {
          console.error("[notify:job]", err)
        }
      }
    }
  }
}
