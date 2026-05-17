/**
 * POST   /api/tasks/[id]/comments  — add a comment
 * DELETE /api/tasks/[id]/comments/[commentId]  — soft-delete own comment
 *   (handled via PATCH on the comment via separate route if needed;
 *    for MVP delete is via ?commentId= query param on this route)
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

const commentSchema = z.object({
  body: z.string().min(1).max(5000),
})

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
      select: { id: true },
    })
    if (!task) return Response.json({ error: "Uppgift hittades ej" }, { status: 404 })

    const comments = await prisma.taskComment.findMany({
      where: { taskId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
    })

    return Response.json(comments)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "tasks:comment")
    const { id } = await params

    const task = await prisma.task.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!task) return Response.json({ error: "Uppgift hittades ej" }, { status: 404 })

    const body   = await req.json()
    const parsed = commentSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId:         id,
        organizationId: ctx.organizationId,
        authorId:       ctx.userId,
        body:           parsed.data.body,
      },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
    })

    return Response.json(comment, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    const { id } = await params
    const commentId = req.nextUrl.searchParams.get("commentId")
    if (!commentId) return Response.json({ error: "commentId krävs" }, { status: 400 })

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, taskId: id, organizationId: ctx.organizationId, deletedAt: null },
      select: { authorId: true },
    })
    if (!comment) return Response.json({ error: "Kommentar hittades ej" }, { status: 404 })

    // Only author or admin can delete
    if (comment.authorId !== ctx.userId) {
      canOrThrow(ctx, "tasks:update_any")
    }

    await prisma.taskComment.update({
      where: { id: commentId },
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
  console.error("[tasks/comments]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
