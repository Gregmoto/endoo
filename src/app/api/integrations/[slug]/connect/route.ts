/**
 * POST /api/integrations/[slug]/connect
 *
 * Initiates OAuth2 flow — returns the authorization URL the client should
 * redirect the user to. For API-key connectors, use POST /api/integrations/connections instead.
 */

import { requireAuth }  from "@/lib/rbac/guards"
import { canOrThrow }   from "@/lib/rbac/policy"
import { getConnector } from "@/lib/integrations/registry"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const ctx      = await requireAuth()
    canOrThrow(ctx, "settings:update")
    const { slug } = await params

    const connector = getConnector(slug)
    if (connector.config.authStrategy !== "oauth2") {
      return Response.json({ error: "Denna integration använder inte OAuth2" }, { status: 400 })
    }

    const body       = await req.json().catch(() => ({}))
    const redirectUri = body.redirectUri ?? `${process.env.NEXTAUTH_URL}/api/integrations/${slug}/callback`

    // Build authorization URL based on slug
    const authUrl = buildAuthUrl(slug, redirectUri, ctx.organizationId)
    return Response.json({ authUrl, redirectUri })
  } catch (err) { return handleError(err) }
}

function buildAuthUrl(slug: string, redirectUri: string, state: string): string {
  const scopes = {
    shopify: ["read_orders", "read_products", "read_customers"],
  }[slug] ?? []

  // Generic OAuth2 URL builder — each connector would supply its own
  const clientId = process.env[`OAUTH_${slug.toUpperCase()}_CLIENT_ID`] ?? ""
  const authBase = process.env[`OAUTH_${slug.toUpperCase()}_AUTH_URL`]  ?? ""

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         scopes.join(" "),
    state,
  })
  return `${authBase}?${params}`
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "ConnectorNotFoundError") return Response.json({ error: "Okänd integration" }, { status: 404 })
  if (name === "UnauthenticatedError")   return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")      return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[integrations/connect]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
