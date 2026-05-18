/**
 * GET /api/cron/process-notification-jobs
 *
 * Processes up to 20 pending NotificationJob rows and sends emails via Resend.
 * Designed to be called by Vercel Cron on a short interval (e.g. every minute).
 *
 * Security: Authorization: Bearer {CRON_SECRET}
 * If CRON_SECRET is not set, all calls are allowed (dev mode).
 *
 * Backoff schedule (minutes): [5, 30, 120, 360, 1440]
 * Index by attempts - 1 after the increment.
 */

import { prisma }           from "@/lib/prisma"
import { sendEmail }        from "@/lib/email/send"
import { renderTemplate }   from "@/lib/notifications/templates"

const BACKOFF_MINUTES = [5, 30, 120, 360, 1440]

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true  // dev mode — no secret configured

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now  = new Date()

  // ── 1. Fetch up to 20 pending jobs ─────────────────────────────────────────
  const jobs = await prisma.notificationJob.findMany({
    where: {
      status:       "pending",
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take:    20,
  })

  let processed = 0
  let sent      = 0
  let failed    = 0

  for (const job of jobs) {
    // ── 2. Claim the job atomically ─────────────────────────────────────────
    const claim = await prisma.notificationJob.updateMany({
      where: { id: job.id, status: "pending" },
      data:  { status: "processing", attempts: { increment: 1 } },
    })
    if (claim.count === 0) continue  // already claimed by another worker

    processed++

    // Re-read current attempts after increment
    const currentAttempts = job.attempts + 1

    try {
      // ── 3. Fetch recipient email ──────────────────────────────────────────
      const user = await prisma.user.findUnique({
        where:  { id: job.userId },
        select: { email: true },
      })

      if (!user?.email) {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status:      "failed",
            processedAt: now,
            error:       "User has no email address",
          },
        })
        failed++
        continue
      }

      // ── 4. Check suppression list ─────────────────────────────────────────
      const suppressed = await prisma.emailSuppression.findUnique({
        where: { organizationId_email: { organizationId: job.organizationId, email: user.email } },
      })
      if (suppressed) {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: "skipped", processedAt: now, error: `Suppressed: ${suppressed.reason}` },
        })
        continue
      }

      // ── 5. Render template ────────────────────────────────────────────────
      const { subject, html } = renderTemplate(
        job.template,
        job.payload as Record<string, unknown>,
      )

      // ── 6. Send email ─────────────────────────────────────────────────────
      const result = await sendEmail({ to: user.email, subject, html })

      // ── 7. Create EmailDelivery record ────────────────────────────────────
      await prisma.emailDelivery.create({
        data: {
          organizationId:    job.organizationId,
          notificationJobId: job.id,
          recipientEmail:    user.email,
          subject,
          providerMessageId: result.id ?? null,
          status:            result.error ? "queued" : "sent",
          errorMessage:      result.error ?? null,
        },
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // ── 8. Mark success ───────────────────────────────────────────────────
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status:      "sent",
          processedAt: new Date(),
          error:       null,
        },
      })
      sent++

      // ── 9. Update Notification.emailSentAt if linked ──────────────────────
      if (job.notificationId) {
        prisma.notification
          .update({
            where: { id: job.notificationId },
            data:  { emailSentAt: new Date() },
          })
          .catch((err) =>
            console.error("[cron/process-notification-jobs] emailSentAt update failed:", err),
          )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[cron/process-notification-jobs] job ${job.id} failed:`, err)

      const backoffMinutes =
        BACKOFF_MINUTES[Math.min(currentAttempts - 1, BACKOFF_MINUTES.length - 1)]

      if (currentAttempts >= job.maxAttempts) {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status:      "failed",
            processedAt: new Date(),
            error:       errorMessage,
          },
        })
        failed++
      } else {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status:        "pending",
            nextAttemptAt: addMinutes(new Date(), backoffMinutes),
            error:         errorMessage,
          },
        })
      }
    }
  }

  console.log(
    `[cron/process-notification-jobs] processed=${processed} sent=${sent} failed=${failed}`,
  )
  return Response.json({ processed, sent, failed })
}
