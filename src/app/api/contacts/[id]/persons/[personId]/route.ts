/**
 * PATCH  /api/contacts/[id]/persons/[personId]  — update contact person
 * DELETE /api/contacts/[id]/persons/[personId]  — soft delete contact person
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

const PatchSchema = z.object({
  name:             z.string().min(1).max(255).optional(),
  role:             z.string().max(100).optional().nullable(),
  email:            z.string().email().optional().nullable(),
  phone:            z.string().max(30).optional().nullable(),
  isPrimary:        z.boolean().optional(),
  isInvoiceContact: z.boolean().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:update")
    const { id, personId } = await params

    // Verify contact belongs to org
    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!contact) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })

    const person = await prisma.contactPerson.findFirst({
      where: { id: personId, contactId: id, deletedAt: null },
    })
    if (!person) return Response.json({ error: "Kontaktperson hittades ej" }, { status: 404 })

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    // If setting as primary, unset others
    if (parsed.data.isPrimary === true) {
      await prisma.contactPerson.updateMany({
        where: { contactId: id, deletedAt: null, isPrimary: true, id: { not: personId } },
        data: { isPrimary: false },
      })
    }

    const updated = await prisma.contactPerson.update({
      where: { id: personId, organizationId: ctx.organizationId },
      data: parsed.data,
    })

    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:update")
    const { id, personId } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!contact) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })

    const person = await prisma.contactPerson.findFirst({
      where: { id: personId, contactId: id, deletedAt: null },
    })
    if (!person) return Response.json({ error: "Kontaktperson hittades ej" }, { status: 404 })

    await prisma.contactPerson.update({
      where: { id: personId },
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
  console.error("[contacts/persons/[personId]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
