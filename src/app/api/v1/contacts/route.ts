import { NextRequest, NextResponse } from "next/server"
import { withApiAuth }               from "@/lib/api/auth"
import { prisma }                    from "@/lib/prisma"

export const GET = withApiAuth("contacts:read", async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const limit  = Math.min(Number(searchParams.get("limit") ?? "50"), 200)
  const cursor = searchParams.get("cursor") ?? undefined
  const q      = searchParams.get("q") ?? undefined

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt:      null,
      isArchived:     false,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy:  { name: "asc" },
    take:     limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:             true,
      type:           true,
      name:           true,
      email:          true,
      phone:          true,
      vatNumber:      true,
      orgNumber:      true,
      status:         true,
      customerNumber: true,
      country:        true,
      city:           true,
      postalCode:     true,
      addressLine1:   true,
      createdAt:      true,
      updatedAt:      true,
    },
  })

  const hasMore    = contacts.length > limit
  const page       = hasMore ? contacts.slice(0, limit) : contacts
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return NextResponse.json({
    object:      "list",
    data:        page,
    has_more:    hasMore,
    next_cursor: nextCursor,
  })
})
