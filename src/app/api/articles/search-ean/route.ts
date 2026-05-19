import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { z } from "zod"

const SearchSchema = z.object({
  ean: z.string().min(1).max(20),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")

    const body   = await req.json()
    const parsed = SearchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const article = await prisma.product.findFirst({
      where: { ean: parsed.data.ean, organizationId: ctx.organizationId, deletedAt: null },
    })

    if (!article) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    return Response.json(article)
  } catch (err) {
    return handleApiError(err, "articles/search-ean")
  }
}
