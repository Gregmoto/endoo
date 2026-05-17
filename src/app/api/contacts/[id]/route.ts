/**
 * GET    /api/contacts/[id]  — contact detail + persons
 * PATCH  /api/contacts/[id]  — update
 * DELETE /api/contacts/[id]  — soft delete
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"
import { indexContact, removeFromIndex } from "@/lib/search/index-entity"

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
        _count: {
          select: {
            invoices: { where: { deletedAt: null } },
          },
        },
      },
    })

    if (!contact) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })
    return Response.json(contact)
  } catch (err) {
    return handleError(err)
  }
}

const PatchSchema = z.object({
  name:             z.string().min(1).max(255).optional(),
  type:             z.enum(["business", "individual"]).optional(),
  status:           z.enum(["active", "inactive", "blocked", "ended", "test"]).optional(),
  customerNumber:   z.string().max(50).optional().nullable(),
  email:            z.string().email().optional().nullable(),
  phone:            z.string().max(30).optional().nullable(),
  website:          z.string().max(255).optional().nullable(),
  orgNumber:        z.string().max(20).optional().nullable(),
  vatNumber:        z.string().max(30).optional().nullable(),
  addressLine1:     z.string().max(255).optional().nullable(),
  addressLine2:     z.string().max(255).optional().nullable(),
  city:             z.string().max(100).optional().nullable(),
  postalCode:       z.string().max(20).optional().nullable(),
  country:          z.string().length(2).optional(),
  deliveryLine1:    z.string().max(255).optional().nullable(),
  deliveryLine2:    z.string().max(255).optional().nullable(),
  deliveryCity:     z.string().max(100).optional().nullable(),
  deliveryPostalCode:z.string().max(20).optional().nullable(),
  deliveryCountry:  z.string().max(2).optional().nullable(),
  defaultCurrency:  z.string().max(3).optional().nullable(),
  defaultPaymentTermsDays: z.number().int().min(0).optional().nullable(),
  customerReference:z.string().max(100).optional().nullable(),
  internalNotes:    z.string().max(5000).optional().nullable(),
  notes:            z.string().max(5000).optional().nullable(),
})

export async function PATCH(
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
    if (!existing) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const updated = await prisma.contact.update({
      where: { id, organizationId: ctx.organizationId },
      data:  parsed.data,
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Contact",
        entityId:       id,
        before:         { name: existing.name, status: existing.status },
        after:          { name: updated.name,  status: updated.status  },
      },
    }).catch(() => {})

    indexContact(ctx.organizationId, updated)

    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:delete")
    const { id } = await params

    const existing = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })

    await prisma.contact.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { deletedAt: new Date() },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "delete",
        entityType:     "Contact",
        entityId:       id,
        before:         { name: existing.name, customerNumber: existing.customerNumber },
      },
    }).catch(() => {})

    removeFromIndex(ctx.organizationId, "contact", id)

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
  console.error("[contacts/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
