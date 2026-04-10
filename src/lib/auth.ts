/**
 * NextAuth.js v5 — Auth configuration
 *
 * JWT contains:
 *   id                          — user UUID
 *   isPlatformAdmin             — bypasses all tenant checks
 *   activeOrganizationId        — currently active tenant
 *   activeOrgSlug               — for URL redirect after switch
 *   impersonatingOrganizationId — agency acting as client (optional)
 *   impersonatingOrgSlug        — for URL
 *
 * Account switching:
 *   POST /api/auth/switch-org   → updates JWT in-place, returns new slug
 *   POST /api/auth/impersonate  → sets impersonatingOrganizationId
 *   POST /api/auth/exit-impersonation → clears impersonating fields
 *
 * The session DB row (sessions table) also stores these IDs so the
 * server can resolve them without decoding the JWT on every request.
 */

import NextAuth, { type NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────
// Type augmentation — add org context to JWT + Session
// ─────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    /** Currently active tenant */
    activeOrganizationId: string
    activeOrgSlug: string
    /** Set when agency staff is acting as a client */
    impersonatingOrganizationId?: string
    impersonatingOrgSlug?: string
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      isPlatformAdmin: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isPlatformAdmin: boolean
    activeOrganizationId: string
    activeOrgSlug: string
    impersonatingOrganizationId?: string
    impersonatingOrgSlug?: string
  }
}

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Providers (Google, Email magic link etc.) added in later phase
  ],
  callbacks: {
    // ── jwt ─────────────────────────────────────────────────────────
    // Called on sign-in, token refresh, and whenever update() is called.
    // update() is used by switch-org to patch the token in-place.
    async jwt({ token, user, trigger, session: updatedSession }) {
      // Initial sign-in: load user + primary membership from DB
      if (user && trigger === "signIn") {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isPlatformAdmin: true },
        })

        // Find primary membership (or first available)
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id, deletedAt: null },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          include: { organization: { select: { id: true, slug: true } } },
        })

        token.id = user.id
        token.isPlatformAdmin = dbUser?.isPlatformAdmin ?? false
        token.activeOrganizationId = membership?.organization.id ?? ""
        token.activeOrgSlug = membership?.organization.slug ?? ""
      }

      // Account switch triggered by update() from switch-org handler
      if (trigger === "update" && updatedSession) {
        if (updatedSession.activeOrganizationId) {
          token.activeOrganizationId = updatedSession.activeOrganizationId
          token.activeOrgSlug = updatedSession.activeOrgSlug
        }
        if (updatedSession.impersonatingOrganizationId !== undefined) {
          token.impersonatingOrganizationId = updatedSession.impersonatingOrganizationId
          token.impersonatingOrgSlug = updatedSession.impersonatingOrgSlug
        }
      }

      return token
    },

    // ── session ──────────────────────────────────────────────────────
    // Projects JWT fields onto the session object available in the app.
    session({ session, token }) {
      session.user.id = token.id
      session.user.isPlatformAdmin = token.isPlatformAdmin
      session.activeOrganizationId = token.activeOrganizationId
      session.activeOrgSlug = token.activeOrgSlug
      session.impersonatingOrganizationId = token.impersonatingOrganizationId
      session.impersonatingOrgSlug = token.impersonatingOrgSlug
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(config)
