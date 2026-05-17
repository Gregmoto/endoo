import { NextRequest, NextResponse } from "next/server"
import { withApiAuth }               from "@/lib/api/auth"
import { getAllStockLevels }          from "@/services/inventory/stock"

export const GET = withApiAuth("inventory:read", async (_req: NextRequest, ctx) => {
  const items = await getAllStockLevels(ctx.organizationId)
  return NextResponse.json({ object: "list", data: items })
})
