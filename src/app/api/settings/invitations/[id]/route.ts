/**
 * DELETE /api/settings/invitations/[id]  — cancel a pending invitation
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "users:invite")

    const { id } = await params

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    })

    if (!invitation || invitation.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Inbjudan hittades ej" }, { status: 404 })
    }

    if (invitation.acceptedAt) {
      return Response.json({ error: "Inbjudan är redan accepterad" }, { status: 400 })
    }

    await prisma.invitation.delete({ where: { id } })

    return new Response(null, { status: 204 })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") {
      return Response.json({ error: "Ej inloggad" }, { status: 401 })
    }
    if ((err as { name?: string }).name === "UnauthorizedError") {
      return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    }
    console.error("[settings/invitations/[id]]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
