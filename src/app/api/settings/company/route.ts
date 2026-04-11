/**
 * GET  /api/settings/company  — fetch company details for the active org
 * PATCH /api/settings/company  — update company details
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

const SELECT = {
  id: true,
  name: true,
  slug: true,
  orgNumber: true,
  vatNumber: true,
  contactEmail: true,
  phone: true,
  website: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  postalCode: true,
  country: true,
  locale: true,
  timezone: true,
  defaultCurrency: true,
  logoUrl: true,
  primaryColor: true,
} as const

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:read")

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: SELECT,
    })

    if (!org) return Response.json({ error: "Org hittades ej" }, { status: 404 })
    return Response.json(org)
  } catch (err: unknown) {
    return handleError(err)
  }
}

const PatchSchema = z.object({
  name:         z.string().min(1).max(255).optional(),
  orgNumber:    z.string().max(20).optional().nullable(),
  vatNumber:    z.string().max(30).optional().nullable(),
  contactEmail: z.string().email().max(255).optional().nullable(),
  phone:        z.string().max(30).optional().nullable(),
  website:      z.string().max(255).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city:         z.string().max(100).optional().nullable(),
  postalCode:   z.string().max(20).optional().nullable(),
  country:      z.string().length(2).optional(),
  locale:       z.string().max(10).optional(),
  timezone:     z.string().max(50).optional(),
  defaultCurrency: z.enum(["SEK", "EUR", "USD", "NOK", "DKK", "GBP"]).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
})

export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const org = await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: parsed.data,
      select: SELECT,
    })

    return Response.json(org)
  } catch (err: unknown) {
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
  console.error("[settings/company]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
