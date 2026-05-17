/**
 * GET  /api/tasks  — list tasks for the current org
 * POST /api/tasks  — create a new task
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"
import { TaskStatus, TaskPriority, TaskEntityType } from "@prisma/client"

// ─── Validation ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  priority:    z.nativeEnum(TaskPriority).default("normal"),
  entityType:  z.nativeEnum(TaskEntityType).optional(),
  entityId:    z.string().uuid().optional(),
  dueDate:     z.string().datetime({ offset: true }).optional(),
  remindAt:    z.string().datetime({ offset: true }).optional(),
  assigneeIds: z.array(z.string().uuid()).max(10).default([]),
})

// ─── GET — list tasks ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "tasks:read")

    const { searchParams } = req.nextUrl
    const status     = searchParams.get("status")     ?? ""
    const assigneeId = searchParams.get("assigneeId") ?? ""
    const entityType = searchParams.get("entityType") ?? ""
    const entityId   = searchParams.get("entityId")   ?? ""
    const mine       = searchParams.get("mine")       === "true"
    const overdue    = searchParams.get("overdue")    === "true"
    const limit      = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200)

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...(status     ? { status: status as TaskStatus } : {}),
        ...(entityType ? { entityType: entityType as TaskEntityType } : {}),
        ...(entityId   ? { entityId } : {}),
        ...(overdue    ? { dueDate: { lt: new Date() }, status: { in: ["open", "in_progress"] } } : {}),
        ...(mine || assigneeId ? {
          assignments: {
            some: { userId: mine ? ctx.userId : assigneeId },
          },
        } : {}),
      },
      orderBy: [
        { dueDate: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      include: {
        assignments: {
          include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
        },
        comments: {
          where: { deletedAt: null },
          select: { id: true },
        },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    })

    return Response.json(tasks.map(t => ({
      ...t,
      commentCount: t.comments.length,
      comments: undefined,
    })))
  } catch (err) {
    return handleError(err)
  }
}

// ─── POST — create task ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "tasks:create")

    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { assigneeIds, entityType, entityId, dueDate, remindAt, ...rest } = parsed.data

    // Validate entity belongs to org
    if (entityType && entityId) {
      const valid = await validateEntityBelongsToOrg(ctx.organizationId, entityType, entityId)
      if (!valid) return Response.json({ error: "Entitet hittades ej" }, { status: 404 })
    }

    // Validate assignees are org members
    if (assigneeIds.length > 0) {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: ctx.organizationId, userId: { in: assigneeIds }, deletedAt: null },
        select: { userId: true },
      })
      if (members.length !== assigneeIds.length) {
        return Response.json({ error: "En eller flera tilldelade är inte medlemmar" }, { status: 400 })
      }
    }

    const task = await prisma.task.create({
      data: {
        ...rest,
        organizationId:  ctx.organizationId,
        createdByUserId: ctx.userId,
        entityType:      entityType ?? null,
        entityId:        entityId ?? null,
        dueDate:         dueDate ? new Date(dueDate) : null,
        remindAt:        remindAt ? new Date(remindAt) : null,
        assignments: assigneeIds.length > 0 ? {
          create: assigneeIds.map(userId => ({
            userId,
            organizationId:   ctx.organizationId,
            assignedByUserId: ctx.userId,
          })),
        } : undefined,
      },
      include: {
        assignments: {
          include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
        },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    })

    return Response.json(task, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function validateEntityBelongsToOrg(
  orgId: string,
  entityType: TaskEntityType,
  entityId: string,
): Promise<boolean> {
  switch (entityType) {
    case "contact":
      return !!(await prisma.contact.findFirst({ where: { id: entityId, organizationId: orgId, deletedAt: null } }))
    case "invoice":
      return !!(await prisma.invoice.findFirst({ where: { id: entityId, organizationId: orgId, deletedAt: null } }))
    case "supplier_invoice":
      return !!(await prisma.supplierInvoice.findFirst({ where: { id: entityId, organizationId: orgId } }))
    case "journal":
      return !!(await prisma.journal.findFirst({ where: { id: entityId, organizationId: orgId } }))
    default:
      return true
  }
}

function handleError(err: unknown): Response {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[tasks]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
