/**
 * GET /api/recurring/[id]/activity
 *
 * Returns a merged, chronological activity timeline for a RecurringSchedule.
 *
 * Sources (merged by timestamp):
 *   1. Schedule creation  — derived from schedule.createdAt + createdByUser
 *   2. Schedule ended     — derived from schedule.status + updatedAt
 *   3. Generated invoices — one synthesised event per Invoice.issueDate
 *   4. ActivityFeedItem   — existing notification events for the schedule
 *                           and all its invoices (sent, viewed, paid, overdue…)
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"

export type ActivityEventType =
  | "schedule_created"
  | "schedule_ended"
  | "schedule_paused"
  | "schedule_resumed"
  | "invoice_generated"
  | "invoice_sent"
  | "invoice_viewed"
  | "invoice_paid"
  | "invoice_overdue"
  | "invoice_voided"
  | "activity"

export type ActivityEvent = {
  id:            string
  type:          ActivityEventType
  timestamp:     string           // ISO-8601
  actor:         string | null    // full name, null for system/cron
  title:         string
  body:          string | null
  href:          string | null    // org-relative path, e.g. "/invoices/uuid"
  invoiceId?:    string
  invoiceNumber?: string
}

function fmtOre(ore: bigint | number | string, currency: string): string {
  return (Number(ore) / 100).toLocaleString("sv-SE", {
    style:                "currency",
    currency,
    maximumFractionDigits: 0,
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:read")
    const { id } = await params

    // ── 1. Load schedule ────────────────────────────────────────────────────
    const schedule = await prisma.recurringSchedule.findFirst({
      where:  { id, organizationId: ctx.organizationId, deletedAt: null },
      select: {
        id:         true,
        status:     true,
        createdAt:  true,
        updatedAt:  true,
        createdByUser: { select: { fullName: true } },
      },
    })
    if (!schedule) return Response.json({ error: "Ej funnet" }, { status: 404 })

    // ── 2. Load invoices ────────────────────────────────────────────────────
    const invoices = await prisma.invoice.findMany({
      where:   { recurringScheduleId: id, organizationId: ctx.organizationId },
      select:  {
        id:            true,
        invoiceNumber: true,
        issueDate:     true,
        totalAmount:   true,
        currency:      true,
        status:        true,
      },
      orderBy: { issueDate: "asc" },
    })

    const invoiceIds  = invoices.map(i => i.id)
    const invoiceById = new Map(invoices.map(i => [i.id, i]))

    // ── 3. Load ActivityFeedItems for schedule + invoices ───────────────────
    const feedItems = invoiceIds.length > 0 || true
      ? await prisma.activityFeedItem.findMany({
          where: {
            organizationId: ctx.organizationId,
            entityId:       { in: [id, ...invoiceIds] },
            deletedAt:      null,
          },
          select: {
            id:          true,
            entityId:    true,
            title:       true,
            body:        true,
            href:        true,
            iconKey:     true,
            actorUserId: true,
            createdAt:   true,
          },
          orderBy: { createdAt: "desc" },
          take:    300,
        })
      : []

    // ── 4. Resolve actor names ──────────────────────────────────────────────
    const actorIds = [...new Set(feedItems.map(f => f.actorUserId).filter(Boolean))] as string[]
    const actors   = actorIds.length
      ? await prisma.user.findMany({
          where:  { id: { in: actorIds } },
          select: { id: true, fullName: true },
        })
      : []
    const actorMap = new Map(actors.map(a => [a.id, a.fullName]))

    // ── 5. Synthesise timeline ──────────────────────────────────────────────

    const events: ActivityEvent[] = []

    // Track which iconKey values map to event types
    const iconToType: Record<string, ActivityEventType> = {
      invoice_sent:    "invoice_sent",
      invoice_viewed:  "invoice_viewed",
      invoice_paid:    "invoice_paid",
      invoice_overdue: "invoice_overdue",
      invoice_voided:  "invoice_voided",
    }

    // Deduplicate: skip synthesised invoice_generated events that already have
    // a feed item covering the same invoice (e.g. if we start dispatching them)
    const feedInvoiceIds = new Set(feedItems.map(f => f.entityId))

    // 5a. Schedule created
    events.push({
      id:        `schedule_created_${schedule.id}`,
      type:      "schedule_created",
      timestamp: schedule.createdAt.toISOString(),
      actor:     schedule.createdByUser?.fullName ?? null,
      title:     schedule.createdByUser
        ? `Schemat skapades av ${schedule.createdByUser.fullName}`
        : "Schemat skapades",
      body:      null,
      href:      null,
    })

    // 5b. Schedule ended (approximated via updatedAt — no dedicated ended_at field)
    if (schedule.status === "ended") {
      events.push({
        id:        `schedule_ended_${schedule.id}`,
        type:      "schedule_ended",
        timestamp: schedule.updatedAt.toISOString(),
        actor:     null,
        title:     "Avtalet avslutades",
        body:      null,
        href:      null,
      })
    }

    // 5c. Generated invoices (one synthesised event per invoice)
    for (const inv of invoices) {
      events.push({
        id:            `invoice_generated_${inv.id}`,
        type:          "invoice_generated",
        timestamp:     new Date(inv.issueDate).toISOString(),
        actor:         null,
        title:         `Faktura ${inv.invoiceNumber ?? "–"} genererades`,
        body:          fmtOre(inv.totalAmount, inv.currency),
        href:          `/invoices/${inv.id}`,
        invoiceId:     inv.id,
        invoiceNumber: inv.invoiceNumber ?? undefined,
      })
    }

    // 5d. ActivityFeedItem events (enrich with invoice context where applicable)
    for (const item of feedItems) {
      const inv  = invoiceById.get(item.entityId)
      const type = (item.iconKey ? iconToType[item.iconKey] : undefined) ?? "activity"
      events.push({
        id:            item.id,
        type,
        timestamp:     item.createdAt.toISOString(),
        actor:         item.actorUserId ? (actorMap.get(item.actorUserId) ?? null) : null,
        title:         item.title,
        body:          item.body ?? null,
        href:          item.href ?? null,
        invoiceId:     inv?.id,
        invoiceNumber: inv?.invoiceNumber ?? undefined,
      })
    }

    // Sort newest first
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    return Response.json({ events })

  } catch (err) {
    const e = err as { name?: string }
    if (e.name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (e.name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[recurring/activity GET]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
