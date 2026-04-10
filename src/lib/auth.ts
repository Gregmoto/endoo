/**
 * NextAuth.js v5 — Auth configuration
 *
 * Strategy: JWT (not database sessions) so we can embed org context
 * directly in the token without a DB round-trip on every request.
 *
 * Providers:
 *   Credentials — email + bcrypt password (primary for MVP)
 *   (Google, magic link to be added post-MVP)
 *
 * JWT payload (our additions on top of NextAuth defaults):
 *   id                           — user UUID
 *   isPlatformAdmin              — bypasses all tenant checks
 *   activeOrganizationId         — current tenant context
 *   activeOrgSlug                — for URL navigation
 *   impersonatingOrganizationId  — agency acting as client (optional)
 *   impersonatingOrgSlug         — for URL
 *
 * Account switching: POST /api/auth/switch-org calls unstable_update()
 * which triggers the jwt callback with trigger="update" and patches
 * the token in-place — no new sign-in required.
 */

import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

// ─────────────────────────────────────────────
// Type augmentation
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
// Credentials schema — validated before DB hit
// ─────────────────────────────────────────────

const CredentialsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  // JWT strategy: org context lives in the token, not a DB session row.
  // This avoids a session-table read on every request while still allowing
  // us to patch context (org switch) via unstable_update().
  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    error:   "/login",
    newUser: "/onboarding",
  },

  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email:    { label: "E-post",  type: "email"    },
        password: { label: "Lösenord", type: "password" },
      },

      async authorize(credentials) {
        // 1. Validate shape
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        // 2. Load user + password account
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            accounts: {
              where: { provider: "credentials" },
              select: { providerAccountId: true }, // stores bcrypt hash
            },
          },
        })

        if (!user || user.deletedAt) return null

        // 3. Verify password
        const hash = user.accounts[0]?.providerAccountId
        if (!hash) return null
        const valid = await bcrypt.compare(parsed.data.password, hash)
        if (!valid) return null

        // 4. Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id:             user.id,
          email:          user.email,
          name:           user.fullName,
          isPlatformAdmin: user.isPlatformAdmin,
        }
      },
    }),
  ],

  callbacks: {
    // ── jwt ─────────────────────────────────────────────────────────
    async jwt({ token, user, trigger, session: updatedSession }) {

      // A. Initial sign-in — load platform flag + primary org
      if (user && trigger === "signIn") {
        token.id             = user.id as string
        token.isPlatformAdmin = (user as { isPlatformAdmin?: boolean }).isPlatformAdmin ?? false

        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id as string, deletedAt: null },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          include: { organization: { select: { id: true, slug: true } } },
        })

        token.activeOrganizationId = membership?.organization.id   ?? ""
        token.activeOrgSlug        = membership?.organization.slug ?? ""
      }

      // B. Account switch / impersonation — patched via update()
      if (trigger === "update" && updatedSession) {
        if (updatedSession.activeOrganizationId !== undefined) {
          token.activeOrganizationId = updatedSession.activeOrganizationId
          token.activeOrgSlug        = updatedSession.activeOrgSlug
        }
        // Explicit undefined clears impersonation
        if ("impersonatingOrganizationId" in updatedSession) {
          token.impersonatingOrganizationId = updatedSession.impersonatingOrganizationId
          token.impersonatingOrgSlug        = updatedSession.impersonatingOrgSlug
        }
      }

      return token
    },

    // ── session ──────────────────────────────────────────────────────
    session({ session, token }) {
      session.user.id              = token.id
      session.user.isPlatformAdmin = token.isPlatformAdmin
      session.activeOrganizationId = token.activeOrganizationId
      session.activeOrgSlug        = token.activeOrgSlug
      if (token.impersonatingOrganizationId) {
        session.impersonatingOrganizationId = token.impersonatingOrganizationId
        session.impersonatingOrgSlug        = token.impersonatingOrgSlug
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(config)
