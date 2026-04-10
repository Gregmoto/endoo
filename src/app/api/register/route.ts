/**
 * POST /api/register
 *
 * Creates a new user + organization in a single DB transaction.
 *
 * Architecture decision — atomic onboarding:
 *   A user without an org is useless, and an org without an owner is broken.
 *   We create both atomically. If either fails, neither is persisted.
 *   The user is immediately set as org owner with isPrimary = true.
 *
 * Password storage:
 *   Stored as a bcrypt hash in user_accounts.providerAccountId.
 *   The users table never touches the password — clean separation.
 *
 * Slug generation:
 *   Derived from org name. If taken, we append a random suffix.
 *
 * On success:
 *   Returns { userId, orgSlug } — client redirects to /app/[orgSlug]
 *   after signing in automatically via signIn("credentials").
 */

import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import bcrypt from "bcryptjs"
import { z } from "zod"

// ─────────────────────────────────────────────
// Validation schema
// ─────────────────────────────────────────────

const RegisterSchema = z.object({
  fullName:  z.string().min(2).max(100),
  email:     z.string().email().max(255),
  password:  z.string().min(8).max(100),
  orgName:   z.string().min(1).max(200),
  orgType:   z.enum(["agency", "customer"]).default("customer"),
})

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Ogiltiga uppgifter", detail: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { fullName, email, password, orgName, orgType } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // Check for existing account before entering transaction
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existing) {
      return Response.json(
        { error: "E-postadressen används redan" },
        { status: 409 }
      )
    }

    // Hash password outside transaction (CPU-bound work)
    const passwordHash = await bcrypt.hash(password, 12)

    // Resolve unique slug
    const baseSlug = slugify(orgName)
    const slug = await resolveUniqueSlug(baseSlug)

    // ── Atomic transaction ───────────────────────────────────────────
    // Everything inside prisma.$transaction is committed together or
    // rolled back entirely. Order matters:
    //   1. Create user (no org reference)
    //   2. Create credential account (references user)
    //   3. Create organization (no user reference)
    //   4. Create membership: owner + isPrimary (references both)
    //
    // The membership row is what grants access — without it the user
    // can log in but sees no org.
    // ────────────────────────────────────────────────────────────────

    const result = await prisma.$transaction(async (tx) => {
      // 1. User
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          fullName,
          emailVerified: false,
          isPlatformAdmin: false,
        },
      })

      // 2. Credential account (bcrypt hash stored in providerAccountId)
      await tx.userAccount.create({
        data: {
          userId:            user.id,
          type:              "credentials",
          provider:          "credentials",
          providerAccountId: passwordHash,
        },
      })

      // 3. Organization
      const org = await tx.organization.create({
        data: {
          name:           orgName,
          slug,
          type:           orgType,
          defaultCurrency: "SEK",
          country:        "SE",
          locale:         "sv-SE",
          timezone:       "Europe/Stockholm",
          isActive:       true,
        },
      })

      // 4. Membership — owner role, marked as primary
      await tx.organizationMember.create({
        data: {
          userId:         user.id,
          organizationId: org.id,
          role:           "owner",
          isPrimary:      true,
          acceptedAt:     new Date(),
        },
      })

      return { userId: user.id, orgSlug: org.slug, orgId: org.id }
    })

    return Response.json(result, { status: 201 })

  } catch (err) {
    // Unique constraint on slug can still race in concurrent requests
    if (isUniqueConstraintError(err, "organizations_slug_key")) {
      return Response.json(
        { error: "Kontonamnet är upptaget, välj ett annat" },
        { status: 409 }
      )
    }
    console.error("[register]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function resolveUniqueSlug(base: string): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { slug: base },
    select: { id: true },
  })
  if (!existing) return base

  // Append a short random suffix
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

function isUniqueConstraintError(err: unknown, constraint: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002" &&
    "meta" in err &&
    JSON.stringify((err as { meta: unknown }).meta).includes(constraint)
  )
}
