/**
 * NextAuth.js v5 — Auth configuration (Node.js runtime)
 *
 * Strategy: JWT so org context lives in the token without a DB read
 * on every request. Account switching patches the token via unstable_update().
 *
 * This file adds the Credentials provider (needs bcrypt + Prisma) and
 * the Prisma adapter on top of the Edge-compatible base config in auth.config.ts.
 * Middleware imports auth.config.ts directly — not this file.
 */

import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authConfig } from "@/lib/auth.config"

// ─────────────────────────────────────────────
// Credentials schema — validated before DB hit
// ─────────────────────────────────────────────

const CredentialsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

// ─────────────────────────────────────────────
// Config — extends the Edge-safe base config
// ─────────────────────────────────────────────

const config: NextAuthConfig = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),

  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email:    { label: "E-post",   type: "email"    },
        password: { label: "Lösenord", type: "password" },
      },

      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            accounts: {
              where:  { provider: "credentials" },
              select: { providerAccountId: true }, // stores bcrypt hash
            },
          },
        })

        if (!user || user.deletedAt) return null

        const hash = user.accounts[0]?.providerAccountId
        if (!hash) return null
        const valid = await bcrypt.compare(parsed.data.password, hash)
        if (!valid) return null

        await prisma.user.update({
          where: { id: user.id },
          data:  { lastLoginAt: new Date() },
        })

        return {
          id:              user.id,
          email:           user.email,
          name:            user.fullName,
          isPlatformAdmin: user.isPlatformAdmin,
        }
      },
    }),
  ],

  callbacks: {
    // ── jwt ──────────────────────────────────────────────────────────
    async jwt({ token, user, trigger, session: updatedSession }) {
      const t  = token as Record<string, unknown>
      const u  = user  as { id?: string; isPlatformAdmin?: boolean } | undefined
      const s  = updatedSession as Record<string, unknown> | null | undefined

      // A. Initial sign-in — embed org context into the token
      if (u && trigger === "signIn") {
        t.id              = u.id
        t.isPlatformAdmin = u.isPlatformAdmin ?? false

        const membership = await prisma.organizationMember.findFirst({
          where:   { userId: u.id as string, deletedAt: null },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          include: { organization: { select: { id: true, slug: true } } },
        })

        t.activeOrganizationId = membership?.organization.id   ?? ""
        t.activeOrgSlug        = membership?.organization.slug ?? ""
      }

      // B. Account switch / impersonation via unstable_update()
      if (trigger === "update" && s) {
        if (s.activeOrganizationId !== undefined) {
          t.activeOrganizationId = s.activeOrganizationId
          t.activeOrgSlug        = s.activeOrgSlug
        }
        if ("impersonatingOrganizationId" in s) {
          t.impersonatingOrganizationId = s.impersonatingOrganizationId
          t.impersonatingOrgSlug        = s.impersonatingOrgSlug
        }
      }

      return token
    },

    // ── session ──────────────────────────────────────────────────────
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

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(config)
