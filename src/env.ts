/**
 * Environment variable validation
 * Fails fast at startup if required vars are missing or malformed.
 * Import this at the top of lib/prisma.ts and lib/auth.ts.
 *
 * Usage: import "@/env"   (side-effect import — validates on load)
 *        import { env } from "@/env"  (typed access)
 */

import { z } from "zod"

const schema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL:   z.string().url(),

  // NextAuth v5 — AUTH_SECRET is the canonical name; NEXTAUTH_SECRET kept for backward compat
  AUTH_SECRET:     z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  AUTH_URL:        z.string().url().optional(),
  NEXTAUTH_URL:    z.string().url().optional(),

  // Stripe
  STRIPE_SECRET_KEY:              z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET:          z.string().startsWith("whsec_").optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().startsWith("re_").optional(),

  // Node
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

// Only validate server-side (not in edge/client bundles)
function validateEnv() {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")
    throw new Error(`\n[env] Missing or invalid environment variables:\n${missing}\n`)
  }

  const data = parsed.data
  if (!data.AUTH_SECRET && !data.NEXTAUTH_SECRET) {
    throw new Error("\n[env] Missing required variable: AUTH_SECRET (or NEXTAUTH_SECRET)\n")
  }

  return data
}

export const env = validateEnv()

/** Resolved app URL — prefers AUTH_URL (NextAuth v5), falls back to NEXTAUTH_URL */
export const APP_URL =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  "https://endoo.se"
