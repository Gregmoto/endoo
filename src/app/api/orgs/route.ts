/**
 * POST /api/orgs — Skapa konto
 *
 * Used when an existing user creates an additional org
 * (e.g. an agency owner creating a customer org for a client).
 * New user registration uses /api/register instead.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { slugify } from "@/lib/utils"
import { CreateOrganizationSchema } from "@/lib/validations/organization"
import { writeAuditLog } from "@/lib/tenant-db"

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()

    const body = await req.json()
    const parsed = CreateOrganizationSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Ogiltiga uppgifter", detail: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, type, orgNumber, vatNumber, country, currency } = parsed.data
    const baseSlug = slugify(name)
    const slug = await resolveUniqueSlug(baseSlug)

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name, slug, type,
          orgNumber:       orgNumber ?? null,
          vatNumber:       vatNumber ?? null,
          country:         country ?? "SE",
          defaultCurrency: currency ?? "SEK",
          locale:          "sv-SE",
          timezone:        "Europe/Stockholm",
          isActive:        true,
        },
      })

      // Creator becomes owner
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId:         ctx.userId,
          role:           "owner",
          isPrimary:      false,
          acceptedAt:     new Date(),
        },
      })

      return org
    })

    await writeAuditLog({
      ctx,
      action: "create",
      entityType: "organization",
      entityId:   result.id,
      after:      { name: result.name, slug: result.slug, type: result.type },
    })

    return Response.json(
      { id: result.id, slug: result.slug, name: result.name, type: result.type },
      { status: 201 }
    )

  } catch (err: unknown) {
    if ((err as { name?: string }).name === "UnauthenticatedError") {
      return Response.json({ error: "Ej inloggad" }, { status: 401 })
    }
    console.error("[orgs POST]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}

async function resolveUniqueSlug(base: string): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { slug: base }, select: { id: true },
  })
  if (!existing) return base
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}
