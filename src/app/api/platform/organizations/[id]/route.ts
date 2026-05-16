/**
 * PATCH /api/platform/organizations/[id]
 * Toggle isActive (activate / deactivate org). Super admin only.
 */

import { requireSuperAdmin } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSuperAdmin()

    const { id } = await params
    const body = await req.json()

    const org = await prisma.organization.findUnique({ where: { id } })
    if (!org) return Response.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        isActive:  typeof body.isActive  === "boolean" ? body.isActive  : undefined,
        deletedAt: body.restore === true ? null : undefined,
      },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    })

    prisma.auditLog.create({
      data: {
        organizationId: id,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Organization",
        entityId:       id,
        before:         { isActive: org.isActive, deletedAt: org.deletedAt },
        after:          { isActive: updated.isActive, deletedAt: updated.deletedAt },
      },
    }).catch(() => {})

    return Response.json(updated)
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if ((err as { name?: string }).name === "UnauthorizedError") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
