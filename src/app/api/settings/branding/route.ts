/**
 * GET  /api/settings/branding — return own branding profile (null if not set)
 * PATCH /api/settings/branding — upsert branding profile fields
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { z }           from "zod"

const patchSchema = z.object({
  displayName:      z.string().max(100).nullable().optional(),
  logoUrl:          z.string().url().nullable().optional(),
  logoDarkUrl:      z.string().url().nullable().optional(),
  faviconUrl:       z.string().url().nullable().optional(),
  primaryColor:     z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  accentColor:      z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  textOnPrimary:    z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  senderName:       z.string().max(100).nullable().optional(),
  senderEmail:      z.string().email().nullable().optional(),
  replyTo:          z.string().email().nullable().optional(),
  emailLogoUrl:     z.string().url().nullable().optional(),
  pdfLogoUrl:       z.string().url().nullable().optional(),
  pdfAccentColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  pdfFooterText:    z.string().max(500).nullable().optional(),
  pdfShowPoweredBy: z.boolean().optional(),
  applyToClients:   z.boolean().optional(),
  allowClientOverride: z.boolean().optional(),
})

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "branding:read")

    const profile = await prisma.brandingProfile.findUnique({
      where: { organizationId: ctx.organizationId },
    })

    return Response.json({ profile })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[settings/branding GET]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "branding:update")

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

    const data = parsed.data

    // Only owners can toggle white-label (applyToClients)
    if (data.applyToClients !== undefined) {
      canOrThrow(ctx, "branding:white_label")
    }

    const profile = await prisma.brandingProfile.upsert({
      where:  { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, ...data },
      update: data,
    })

    return Response.json({ profile })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[settings/branding PATCH]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
