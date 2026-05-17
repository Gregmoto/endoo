/**
 * GET    /api/tasks/[id]  — task detail with comments
 * PATCH  /api/tasks/[id]  — update task
 * DELETE /api/tasks/[id]  — soft-delete
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"
import { TaskStatus, TaskPriority, TaskEntityType } from "@prisma/client"

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "tasks:read")
    const { id } = await params

    const task = await prisma.task.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        assignments: {
          include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    })

    if (!task) return Response.json({ error: "Uppgift hittades ej" }, { status: 404 })
    return Response.json(task)
  } catch (err) {
    return handleError(err)
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  title:       z.string().min(1).max(255).optional(),
  description: z.string().max(10000).nullable().optional(),
  status:      z.nativeEnum(TaskStatus).optional(),
  priority:    z.nativeEnum(TaskPriority).optional(),
  entityType:  z.nativeEnum(TaskEntityType).nullable().optional(),
  entityId:    z.string().uuid().nullable().optional(),
  dueDate:     z.string().datetime({ offset: true }).nullable().optional(),
  remindAt:    z.string().datetime({ offset: true }).nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).max(10).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    const { id } = await params

    const existing = await prisma.task.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: { assignments: { select: { userId: true } } },
    })
    if (!existing) return Response.json({ error: "Uppgift hittades ej" }, { status: 404 })

    // Permission: update_any OR (update_own AND is creator/assignee)
    const isOwner = existing.createdByUserId === ctx.userId ||
                    existing.assignments.some(a => a.userId === ctx.userId)
    try {
      canOrThrow(ctx, "tasks:update_any")
    } catch {
      if (!isOwner) {
        canOrThrow(ctx, "tasks:update_own") // throws Unauthorized if no permission
        if (!isOwner) return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
      }
    }

    const body   = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { assigneeIds, dueDate, remindAt, status, ...rest } = parsed.data

    // Handle completion
    const completedAt       = status === "done" && existing.status !== "done" ? new Date() : undefined
    const completedByUserId = status === "done" && existing.status !== "done" ? ctx.userId  : undefined

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(status      !== undefined ? { status } : {}),
        ...(dueDate     !== undefined ? { dueDate:  dueDate  ? new Date(dueDate)  : null } : {}),
        ...(remindAt    !== undefined ? { remindAt: remindAt ? new Date(remindAt) : null } : {}),
        ...(completedAt       ? { completedAt, completedByUserId } : {}),
        ...(assigneeIds !== undefined ? {
          assignments: {
            deleteMany: {},
            create: assigneeIds.map(userId => ({
              userId,
              organizationId:   ctx.organizationId,
              assignedByUserId: ctx.userId,
            })),
          },
        } : {}),
      },
      include: {
        assignments: {
          include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    })

    return Response.json(task)
  } catch (err) {
    return handleError(err)
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    const { id } = await params

    const existing = await prisma.task.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { createdByUserId: true },
    })
    if (!existing) return Response.json({ error: "Uppgift hittades ej" }, { status: 404 })

    const isOwner = existing.createdByUserId === ctx.userId
    try {
      canOrThrow(ctx, "tasks:delete_any")
    } catch {
      canOrThrow(ctx, "tasks:delete_own")
      if (!isOwner) return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    }

    await prisma.task.update({
      where: { id },
      data:  { deletedAt: new Date() },
    })

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[tasks/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
