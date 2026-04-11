/**
 * PATCH  /api/settings/users/[memberId]  — change role
 * DELETE /api/settings/users/[memberId]  — remove member
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

const PatchSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "users:update_role")

    const { memberId } = await params
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltig roll" }, { status: 400 })
    }

    // Verify member belongs to this org
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.organizationId !== ctx.organizationId || member.deletedAt) {
      return Response.json({ error: "Medlem hittades ej" }, { status: 404 })
    }

    // Cannot change role of owners
    if (member.role === "owner") {
      return Response.json({ error: "Ägarrollen kan inte ändras" }, { status: 400 })
    }

    // Cannot change your own role
    if (member.userId === ctx.userId) {
      return Response.json({ error: "Du kan inte ändra din egen roll" }, { status: 400 })
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: parsed.data.role },
      select: { id: true, role: true },
    })

    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "users:remove")

    const { memberId } = await params

    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.organizationId !== ctx.organizationId || member.deletedAt) {
      return Response.json({ error: "Medlem hittades ej" }, { status: 404 })
    }

    if (member.role === "owner") {
      return Response.json({ error: "Ägaren kan inte tas bort" }, { status: 400 })
    }

    if (member.userId === ctx.userId) {
      return Response.json({ error: "Du kan inte ta bort dig själv" }, { status: 400 })
    }

    await prisma.organizationMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    })

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[settings/users/[memberId]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
