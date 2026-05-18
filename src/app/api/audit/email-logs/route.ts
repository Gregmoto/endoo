import { prisma }         from "@/lib/prisma"
import { requireAuth }    from "@/lib/rbac/guards"
import { canOrThrow }     from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma }         from "@prisma/client"

export async function GET(req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:read")

    const url    = new URL(req.url)
    const page   = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
    const limit  = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)))
    const status = url.searchParams.get("status") ?? ""
    const email  = url.searchParams.get("email") ?? ""

    const where: Prisma.EmailDeliveryWhereInput = {
      organizationId: ctx.organizationId,
      ...(status ? { status } : {}),
      ...(email  ? { recipientEmail: { contains: email, mode: "insensitive" } } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.emailDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:                true,
          recipientEmail:    true,
          subject:           true,
          status:            true,
          providerMessageId: true,
          openedAt:          true,
          clickedAt:         true,
          deliveredAt:       true,
          bouncedAt:         true,
          createdAt:         true,
          events:            true,
        },
      }),
      prisma.emailDelivery.count({ where }),
    ])

    return Response.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    return handleApiError(err, "audit/email-logs")
  }
}
