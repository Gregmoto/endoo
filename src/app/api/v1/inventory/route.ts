import { NextRequest }                from "next/server"
import { withApiAuth }               from "@/lib/api/auth"
import { getAllStockLevels }          from "@/services/inventory/stock"
import { apiCursor }                 from "@/lib/api/response"

export const GET = withApiAuth("inventory:read", async (_req: NextRequest, ctx) => {
  const items = await getAllStockLevels(ctx.organizationId)
  return apiCursor(items, null, false)
})
