/**
 * GET   /api/notifications/preferences — return all preferences merged with defaults
 * PATCH /api/notifications/preferences — upsert one or more preference rows
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { CATEGORY_DEFAULTS } from "@/lib/notifications/preferences"
import { z } from "zod"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[notifications/preferences]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function GET(_req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()

    const rows = await prisma.notificationPreference.findMany({
      where: { userId: ctx.userId, organizationId: ctx.organizationId },
    })

    const byCategory = new Map(rows.map((r) => [r.category, r]))

    const preferences = Object.entries(CATEGORY_DEFAULTS).map(([category, defaults]) => {
      const row = byCategory.get(category)
      return {
        category,
        inApp: row?.inApp ?? defaults.inApp,
        email: row?.email ?? defaults.email,
        emailDigest: row?.emailDigest ?? defaults.emailDigest,
      }
    })

    return Response.json({ preferences })
  } catch (err) {
    return handleError(err)
  }
}

const PreferenceItemSchema = z.object({
  category: z.string().min(1),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
})

const PatchBodySchema = z.array(PreferenceItemSchema)

export async function PATCH(req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()

    const body: unknown = await req.json()
    const parsed = PatchBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga data", details: parsed.error.flatten() }, { status: 422 })
    }

    const items = parsed.data

    await Promise.all(
      items.map((item) => {
        const defaults = CATEGORY_DEFAULTS[item.category] ?? {
          inApp: true,
          email: true,
          emailDigest: false,
        }

        return prisma.notificationPreference.upsert({
          where: {
            userId_organizationId_category: {
              userId: ctx.userId,
              organizationId: ctx.organizationId,
              category: item.category,
            },
          },
          create: {
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            category: item.category,
            inApp: item.inApp ?? defaults.inApp,
            email: item.email ?? defaults.email,
            emailDigest: item.emailDigest ?? defaults.emailDigest,
          },
          update: {
            ...(item.inApp !== undefined ? { inApp: item.inApp } : {}),
            ...(item.email !== undefined ? { email: item.email } : {}),
            ...(item.emailDigest !== undefined ? { emailDigest: item.emailDigest } : {}),
          },
        })
      })
    )

    // Re-fetch the full merged list after updates
    const rows = await prisma.notificationPreference.findMany({
      where: { userId: ctx.userId, organizationId: ctx.organizationId },
    })

    const byCategory = new Map(rows.map((r) => [r.category, r]))

    const preferences = Object.entries(CATEGORY_DEFAULTS).map(([category, defaults]) => {
      const row = byCategory.get(category)
      return {
        category,
        inApp: row?.inApp ?? defaults.inApp,
        email: row?.email ?? defaults.email,
        emailDigest: row?.emailDigest ?? defaults.emailDigest,
      }
    })

    return Response.json({ preferences })
  } catch (err) {
    return handleError(err)
  }
}
