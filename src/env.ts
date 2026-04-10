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

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
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
    const missing = parsed.error.errors
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n")
    throw new Error(`\n[env] Missing or invalid environment variables:\n${missing}\n`)
  }
  return parsed.data
}

export const env = validateEnv()
