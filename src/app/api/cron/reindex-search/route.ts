/**
 * GET /api/cron/reindex-search
 *
 * Nightly cron that rebuilds the search_index table for every active org.
 * Cleans up stale entries from deleted entities automatically.
 *
 * Vercel cron schedule (vercel.json): "0 3 * * *" — 03:00 UTC nightly
 * Security: Authorization: Bearer {CRON_SECRET}
 */
import { type NextRequest } from "next/server"
import { reindexAllOrgs } from "@/lib/search/reindex"

export async function GET(req: NextRequest): Promise<Response> {
  const secret = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const started = Date.now()

  try {
    const { orgs, indexed } = await reindexAllOrgs()
    return Response.json({
      ok:      true,
      orgs,
      indexed,
      ms:      Date.now() - started,
    })
  } catch (err) {
    console.error("[cron/reindex-search]", err)
    return Response.json({ error: "Reindex failed", detail: String(err) }, { status: 500 })
  }
}
