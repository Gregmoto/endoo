import { NextRequest, NextResponse } from "next/server"
import { withApiAuth }               from "@/lib/api/auth"
import { prisma }                    from "@/lib/prisma"

function ser(v: unknown) {
  return JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)))
}

export const GET = withApiAuth("journals:read", async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const limit  = Math.min(Number(searchParams.get("limit") ?? "50"), 200)
  const cursor = searchParams.get("cursor") ?? undefined
  const status = searchParams.get("status") ?? "posted"

  const journals = await prisma.journal.findMany({
    where: {
      organizationId: ctx.organizationId,
      status:         status as never,
    },
    orderBy:  { date: "desc" },
    take:     limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:          true,
      reference:   true,
      date:        true,
      description: true,
      status:      true,
      sourceType:  true,
      sourceId:    true,
      postedAt:    true,
      createdAt:   true,
      entries: {
        select: {
          id:       true,
          debit:    true,
          credit:   true,
          vatCode:  true,
          account: {
            select: { number: true, name: true },
          },
        },
      },
    },
  })

  const hasMore    = journals.length > limit
  const page       = hasMore ? journals.slice(0, limit) : journals
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return NextResponse.json({
    object:      "list",
    data:        ser(page),
    has_more:    hasMore,
    next_cursor: nextCursor,
  })
})
