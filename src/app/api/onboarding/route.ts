/**
 * POST /api/onboarding
 *
 * Creates the user's first organization and sets it as the active org in the JWT.
 * Idempotent: if the user already has a membership, returns the existing org.
 *
 * Auth: must be authenticated but does NOT require an active org (the whole
 * point is to create one). Uses auth() directly, not requireAuth().
 */

import { auth, unstable_update } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { seedBasAccounts } from "@/lib/accounting/accounts"
import { seedLedgerDefaults } from "@/lib/accounting/journals"
import { z } from "zod"

const Schema = z.object({
  name:      z.string().min(1).max(255),
  orgNumber: z.string().max(20).optional().nullable(),
  type:      z.enum(["customer", "agency"]),
  locale:    z.enum(["sv-SE", "en-US", "nb-NO", "da-DK"]).default("sv-SE"),
  currency:  z.enum(["SEK", "EUR", "USD", "NOK", "DKK", "GBP"]).default("SEK"),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Ej inloggad" }, { status: 401 })
    }
    const userId = session.user.id

    // Idempotency: return existing org if user already belongs to one
    const existing = await prisma.organizationMember.findFirst({
      where: { userId, deletedAt: null },
      include: { organization: { select: { id: true, slug: true } } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    })
    if (existing) {
      await unstable_update({
        activeOrganizationId: existing.organizationId,
        activeOrgSlug:        existing.organization.slug,
      })
      return Response.json({ orgSlug: existing.organization.slug })
    }

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, orgNumber, type, locale, currency } = parsed.data

    // Generate a URL-safe slug from the company name
    const base = name
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "foretag"

    let slug    = base
    let attempt = 0
    while (await prisma.organization.findUnique({ where: { slug } })) {
      attempt++
      slug = `${base}-${attempt}`
    }

    // Create org + owner membership atomically
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        type:            type as "agency" | "customer",
        orgNumber:       orgNumber ?? null,
        locale,
        defaultCurrency: currency,
        members: {
          create: {
            userId,
            role:       "owner",
            isPrimary:  true,
            acceptedAt: new Date(),
          },
        },
      },
      select: { id: true, slug: true },
    })

    // Seed BAS 2024 chart of accounts + default fiscal year and journal series
    // (fire-and-forget — non-blocking)
    seedBasAccounts(org.id).catch(() => {})
    seedLedgerDefaults(org.id).catch(() => {})

    // Patch the JWT so the user immediately has org context
    await unstable_update({
      activeOrganizationId: org.id,
      activeOrgSlug:        org.slug,
    })

    // Audit log (fire-and-forget)
    prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId,
        action:     "create",
        entityType: "Organization",
        entityId:   org.id,
        meta:       { event: "onboarding", name, type, locale, currency },
      },
    }).catch(() => {})

    return Response.json({ orgSlug: org.slug }, { status: 201 })
  } catch (err) {
    console.error("[onboarding]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
