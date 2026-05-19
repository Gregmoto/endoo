/**
 * GET /api/customers/[id]/activity
 *
 * Returns activity timeline for a customer (audit log + invoice events).
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:read")
    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!contact) return Response.json({ error: "Kunden hittades ej" }, { status: 404 })

    const url   = new URL(req.url)
    const page  = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const limit = 50

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId: ctx.organizationId,
        OR: [
          { entityType: "Contact", entityId: id },
          { entityType: "Invoice", before: { path: ["contactId"], equals: id } },
          { entityType: "Invoice", after:  { path: ["contactId"], equals: id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id:         true,
        action:     true,
        entityType: true,
        entityId:   true,
        before:     true,
        after:      true,
        createdAt:  true,
        user:       { select: { fullName: true, email: true } },
      },
    })

    return Response.json({ activity: auditLogs, page, limit })
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
  console.error("[customers/activity]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
