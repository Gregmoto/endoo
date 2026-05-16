/**
 * Edge-compatible NextAuth config — no Prisma, no bcrypt.
 *
 * Used by src/middleware.ts (Edge runtime). The full config in auth.ts
 * extends this with the Credentials provider and PrismaAdapter for
 * Node.js contexts (API routes, server actions, RSC).
 *
 * Rule: nothing imported here may touch Node.js built-ins or Prisma.
 */

import type { NextAuthConfig } from "next-auth"

// ─────────────────────────────────────────────
// Type augmentation — declared here so both
// middleware and the full auth.ts share the same types.
// ─────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    activeOrganizationId: string
    activeOrgSlug: string
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

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    error:   "/login",
    newUser: "/onboarding",
  },

  // Providers are added in auth.ts (Credentials needs bcrypt + Prisma)
  providers: [],

  callbacks: {
    // Pass-through in Edge — the real jwt logic (DB lookups) lives in auth.ts
    // and only runs on trigger=signIn/update, never in middleware.
    jwt({ token }) {
      return token
    },

    session({ session, token }) {
      const t = token as Record<string, unknown>
      session.user.id              = t.id as string
      session.user.isPlatformAdmin = (t.isPlatformAdmin as boolean) ?? false
      session.activeOrganizationId = (t.activeOrganizationId as string) ?? ""
      session.activeOrgSlug        = (t.activeOrgSlug as string) ?? ""
      if (t.impersonatingOrganizationId) {
        session.impersonatingOrganizationId = t.impersonatingOrganizationId as string
        session.impersonatingOrgSlug        = t.impersonatingOrgSlug as string | undefined
      }
      return session
    },
  },
}
