/**
 * PUT /api/settings/account-mappings/bas/[vatType] — upsert one VAT-type account mapping
 */

import { requireAuth }    from "@/lib/rbac/guards"
import { canOrThrow }     from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { prisma }         from "@/lib/prisma"
import { z }              from "zod"

const UpdateSchema = z.object({
  salesAccount:  z.string().min(1).max(10),
  vatAccountOut: z.string().max(10),
  vatAccountIn:  z.string().max(10).optional(),
  description:   z.string().max(200).optional(),
})

export async function PUT(
  req:     Request,
  { params }: { params: Promise<{ vatType: string }> },
) {
  try {
    const ctx     = await requireAuth()
    canOrThrow(ctx, "settings:account_mappings:update")

    const { vatType } = await params
    const body  = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Ogiltiga uppgifter", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { salesAccount, vatAccountOut, vatAccountIn, description } = parsed.data

    const mapping = await prisma.accountMapping.upsert({
      where: {
        organizationId_vatTypeCode: {
          organizationId: ctx.organizationId,
          vatTypeCode:    vatType,
        },
      },
      update: {
        salesAccount,
        vatAccountOut,
        vatAccountIn:  vatAccountIn ?? null,
        description:   description  ?? null,
      },
      create: {
        organizationId: ctx.organizationId,
        vatTypeCode:    vatType,
        salesAccount,
        vatAccountOut,
        vatAccountIn:  vatAccountIn ?? null,
        description:   description  ?? null,
      },
    })

    return Response.json({ mapping })
  } catch (err) {
    return handleApiError(err, "settings/account-mappings/bas/[vatType]")
  }
}
