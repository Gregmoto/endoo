/**
 * GET /api/search?q=…&types=…&limit=…
 *
 * Returns up to `limit` SearchResult[] scoped to the current org.
 * Requires authentication; no specific RBAC permission beyond org membership.
 */
import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { searchQuery } from "@/lib/search/query"
import type { SearchEntityType } from "@/lib/search/types"

const VALID_TYPES = new Set<SearchEntityType>([
  "contact", "invoice", "supplier_invoice", "product", "journal", "member",
])

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()

    const { searchParams } = req.nextUrl
    const q     = (searchParams.get("q") ?? "").trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 40)

    const rawTypes = searchParams.get("types")
    const types: SearchEntityType[] | undefined = rawTypes
      ? rawTypes.split(",").filter(t => VALID_TYPES.has(t as SearchEntityType)) as SearchEntityType[]
      : undefined

    if (!q) return Response.json([])

    const results = await searchQuery({
      organizationId: ctx.organizationId,
      q,
      types:  types?.length ? types : undefined,
      limit,
    })

    return Response.json(results)
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthenticated")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    console.error("[search GET]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
