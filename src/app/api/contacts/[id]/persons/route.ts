/**
 * GET  /api/contacts/[id]/persons  — list contact persons
 * POST /api/contacts/[id]/persons  — create contact person
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

const PersonSchema = z.object({
  name:             z.string().min(1).max(255),
  role:             z.string().max(100).optional().nullable(),
  email:            z.string().email().optional().nullable(),
  phone:            z.string().max(30).optional().nullable(),
  isPrimary:        z.boolean().default(false),
  isInvoiceContact: z.boolean().default(false),
})

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
    })
    if (!contact) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })

    const persons = await prisma.contactPerson.findMany({
      where: { contactId: id, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    })

    return Response.json(persons)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:update")
    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!contact) return Response.json({ error: "Kontakt hittades ej" }, { status: 404 })

    const body = await req.json()
    const parsed = PersonSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    // If new person is primary, unset existing primary
    if (parsed.data.isPrimary) {
      await prisma.contactPerson.updateMany({
        where: { contactId: id, deletedAt: null, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const person = await prisma.contactPerson.create({
      data: {
        ...parsed.data,
        contactId: id,
        organizationId: ctx.organizationId,
      },
    })

    return Response.json(person, { status: 201 })
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
  console.error("[contacts/persons]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
