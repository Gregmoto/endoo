import { NextRequest }                from "next/server"
import { withApiAuth }               from "@/lib/api/auth"
import { prisma }                    from "@/lib/prisma"
import { apiCursor }                 from "@/lib/api/response"

export const GET = withApiAuth("products:read", async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const limit  = Math.min(Number(searchParams.get("limit") ?? "50"), 200)
  const cursor = searchParams.get("cursor") ?? undefined

  const products = await prisma.product.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt:      null,
      isActive:       true,
    },
    orderBy:  { name: "asc" },
    take:     limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:          true,
      name:        true,
      description: true,
      sku:         true,
      type:        true,
      unit:        true,
      unitPrice:   true,
      currency:    true,
      taxRate:     true,
      isActive:    true,
      createdAt:   true,
      updatedAt:   true,
    },
  })

  const hasMore    = products.length > limit
  const page       = hasMore ? products.slice(0, limit) : products
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return apiCursor(page, nextCursor, hasMore)
})
