/**
 * GET  /api/integrations/connections  — list org's connections
 * POST /api/integrations/connections  — connect via API key
 */

import { requireAuth }    from "@/lib/rbac/guards"
import { canOrThrow }     from "@/lib/rbac/policy"
import { prisma }         from "@/lib/prisma"
import { connectApiKey }  from "@/services/integrations/connection"
import { listConnectors } from "@/lib/integrations/registry"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:read")

    const connections = await prisma.connection.findMany({
      where:   { organizationId: ctx.organizationId },
      select:  {
        id: true, integrationSlug: true, status: true,
        lastSyncAt: true, errorCount: true, lastErrorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const registry = listConnectors()

    return Response.json({
      connections: connections.map((c) => ({
        ...c,
        displayName: registry.find((r) => r.slug === c.integrationSlug)?.displayName ?? c.integrationSlug,
      })),
    })
  } catch (err) { return handleError(err) }
}

export async function POST(req: Request) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const body = await req.json()
    const { slug, apiKey, config } = body

    if (!slug)   return Response.json({ error: "slug krävs" }, { status: 400 })
    if (!apiKey) return Response.json({ error: "apiKey krävs" }, { status: 400 })

    const connection = await connectApiKey(ctx.organizationId, ctx.userId, slug, apiKey, config)

    return Response.json({ connection: { id: connection.id, slug, status: connection.status } }, { status: 201 })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "ConnectorNotFoundError")        return Response.json({ error: "Okänd integration" }, { status: 400 })
  if (name === "ConnectionAlreadyExistsError")  return Response.json({ error: (err as Error).message }, { status: 409 })
  if (name === "UnauthenticatedError")          return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")             return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[integrations/connections]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
