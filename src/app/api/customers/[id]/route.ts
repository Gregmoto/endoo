/**
 * GET  /api/customers/[id]  — customer detail (Contact record)
 * PUT  /api/customers/[id]  — update internalNotes (and other fields)
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:read")
    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        contactPersons: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        accountManager: { select: { id: true, fullName: true, email: true } },
        priceList:       { select: { id: true, name: true } },
        deliveryMethod:  { select: { id: true, name: true } },
        deliveryTerms:   { select: { id: true, name: true } },
        _count: {
          select: {
            invoices: { where: { deletedAt: null } },
          },
        },
      },
    })

    if (!contact) return Response.json({ error: "Kunden hittades ej" }, { status: 404 })
    return Response.json(contact)
  } catch (err) {
    return handleError(err)
  }
}

const PutSchema = z.object({
  internalNotes: z.string().max(10000).nullable().optional(),
  notes:         z.string().max(10000).nullable().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:update")
    const { id } = await params

    const existing = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Kunden hittades ej" }, { status: 404 })

    const body = await req.json()
    const parsed = PutSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const updated = await prisma.contact.update({
      where: { id, organizationId: ctx.organizationId },
      data:  parsed.data,
    })

    return Response.json(updated)
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
  console.error("[customers/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
