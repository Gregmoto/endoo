import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk } from "@/lib/api/response"
import { toJSON } from "@/lib/serialize"
import { z } from "zod"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "payments:read")

    const url  = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get("size") ?? "25")))

    const where = { organizationId: ctx.organizationId, status: "unmatched" as const }

    const [total, items] = await prisma.$transaction([
      prisma.unmatchedPayment.count({ where }),
      prisma.unmatchedPayment.findMany({
        where,
        orderBy: { paymentDate: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
    ])

    return Response.json(toJSON({
      items,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    }))
  } catch (err) {
    return handleApiError(err, "payments/unmatched:GET")
  }
}

const WriteOffSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function DELETE(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "payments:write_off_unmatched")

    const body   = await req.json()
    const parsed = WriteOffSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    await prisma.unmatchedPayment.updateMany({
      where: {
        id:             { in: parsed.data.ids },
        organizationId: ctx.organizationId,
      },
      data: { status: "written_off" },
    })

    return apiOk({ ok: true })
  } catch (err) {
    return handleApiError(err, "payments/unmatched:DELETE")
  }
}
