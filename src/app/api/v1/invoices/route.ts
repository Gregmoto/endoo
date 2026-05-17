import { NextRequest, NextResponse } from "next/server"
import { withApiAuth }               from "@/lib/api/auth"
import { prisma }                    from "@/lib/prisma"

function serializeInvoice(inv: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(inv, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  )
}

export const GET = withApiAuth("invoices:read", async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const status  = searchParams.get("status") ?? undefined
  const limit   = Math.min(Number(searchParams.get("limit") ?? "50"), 200)
  const cursor  = searchParams.get("cursor") ?? undefined

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt:      null,
      ...(status ? { status: status as never } : {}),
    },
    orderBy:  { createdAt: "desc" },
    take:     limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:             true,
      invoiceNumber:  true,
      status:         true,
      type:           true,
      currency:       true,
      issueDate:      true,
      dueDate:        true,
      totalAmount:    true,
      paidAmount:     true,
      taxAmount:      true,
      subtotalAmount: true,
      billingName:    true,
      billingEmail:   true,
      createdAt:      true,
      updatedAt:      true,
      contact: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  const hasMore    = invoices.length > limit
  const page       = hasMore ? invoices.slice(0, limit) : invoices
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return NextResponse.json({
    object:     "list",
    data:       page.map(serializeInvoice),
    has_more:   hasMore,
    next_cursor: nextCursor,
  })
})
