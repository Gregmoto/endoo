/**
 * NextAuth.js v5 configuration — stub
 * Full implementation in auth setup phase.
 */
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    activeOrganizationId?: string
    impersonatingOrganizationId?: string
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      isPlatformAdmin?: boolean
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
})
