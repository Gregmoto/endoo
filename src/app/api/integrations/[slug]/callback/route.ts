/**
 * GET /api/integrations/[slug]/callback
 *
 * OAuth2 redirect target. Exchanges the authorization code for tokens,
 * stores the connection, and redirects back to the settings page.
 */

import { requireAuth }   from "@/lib/rbac/guards"
import { canOrThrow }    from "@/lib/rbac/policy"
import { connectOAuth }  from "@/services/integrations/connection"
import { NextResponse }  from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const ctx      = await requireAuth()
    canOrThrow(ctx, "settings:update")
    const { slug } = await params

    const url   = new URL(req.url)
    const code  = url.searchParams.get("code")
    const error = url.searchParams.get("error")

    if (error || !code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=${error ?? "no_code"}`
      )
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/${slug}/callback`
    await connectOAuth(ctx.organizationId, ctx.userId, slug, code, redirectUri)

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?connected=${slug}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=${encodeURIComponent(msg)}`
    )
  }
}
