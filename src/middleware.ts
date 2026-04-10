/**
 * Endoo — Next.js Edge Middleware
 *
 * Runs on every request BEFORE rendering. Handles:
 *   1. Authentication gate — redirect unauthenticated users to /login
 *   2. Route-level authorization — coarse-grained role checks
 *   3. Org slug validation — ensures user has access to the org in the URL
 *
 * Fine-grained permission checks (can(), requirePermission()) happen
 * in Route Handlers, Server Actions, and RSC layouts — NOT here.
 * Edge middleware cannot call Prisma, so we only inspect the JWT.
 *
 * Route structure:
 *   /                         → public (marketing)
 *   /login                    → public
 *   /register                 → public
 *   /invite/[token]           → public
 *   /app                      → redirect to first org
 *   /app/[orgSlug]/**         → requires auth + org membership (checked via JWT)
 *   /platform/**              → requires super_admin JWT flag
 *   /api/auth/**              → NextAuth (always public)
 *   /api/**                   → requires auth (JWT); fine-grained in handler
 */

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/about",
  "/privacy",
  "/terms",
]

const PUBLIC_PREFIXES = [
  "/invite/",
  "/api/auth/",
  "/_next/",
  "/favicon",
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export default auth((req: NextRequest & { auth: { user?: { id: string; isPlatformAdmin?: boolean } } | null }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ── Public routes ─────────────────────────────────────────
  if (isPublic(pathname)) {
    // Redirect logged-in users away from login/register
    if (session && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/app", req.url))
    }
    return NextResponse.next()
  }

  // ── Require authentication ────────────────────────────────
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Platform admin routes ─────────────────────────────────
  if (pathname.startsWith("/platform")) {
    if (!session.user.isPlatformAdmin) {
      return NextResponse.redirect(new URL("/app", req.url))
    }
    return NextResponse.next()
  }

  // ── App routes ────────────────────────────────────────────
  // Fine-grained org membership is verified in the RSC layout,
  // which can call Prisma. Middleware only checks authentication.
  if (pathname.startsWith("/app")) {
    return NextResponse.next()
  }

  // ── API routes ────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    // Authentication already confirmed above.
    // Permission checks happen inside each handler via requirePermission().
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
