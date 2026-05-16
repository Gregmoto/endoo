/**
 * GET /api/contacts/[id]/history
 *
 * Returns recent invoices + audit log entries for the contact.
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
    if (!contact) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50)

    const [invoices, auditLogs] = await Promise.all([
      prisma.invoice.findMany({
        where: { contactId: id, organizationId: ctx.organizationId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          currency: true,
          issueDate: true,
          dueDate: true,
          paidAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { entityType: "Contact", entityId: id, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
          user: { select: { fullName: true, email: true } },
        },
      }),
    ])

    return Response.json({ invoices, auditLogs })
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
  console.error("[contacts/history]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
