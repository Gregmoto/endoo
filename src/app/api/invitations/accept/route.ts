/**
 * POST /api/invitations/accept
 *
 * Accepts an invitation. Two scenarios:
 *
 * A. User already exists → just create membership, no new account.
 * B. New user → create user + credentials + membership atomically.
 *
 * After accepting, the user's active org is switched to the new org.
 */

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const AcceptSchema = z.discriminatedUnion("scenario", [
  // Existing user — just need the token
  z.object({
    scenario: z.literal("existing"),
    token:    z.string().length(64),
  }),
  // New user — provide name + password
  z.object({
    scenario: z.literal("new"),
    token:    z.string().length(64),
    fullName: z.string().min(2).max(100),
    password: z.string().min(8).max(100),
  }),
])

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = AcceptSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const data = parsed.data

    // Load + validate invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token: data.token },
      include: { organization: { select: { id: true, slug: true, name: true } } },
    })

    if (!invitation)                          return Response.json({ error: "Ogiltig inbjudan" }, { status: 404 })
    if (invitation.acceptedAt)                return Response.json({ error: "Inbjudan är redan använd" }, { status: 410 })
    if (invitation.expiresAt < new Date())    return Response.json({ error: "Inbjudan har gått ut" }, { status: 410 })

    const result = await prisma.$transaction(async (tx) => {
      let userId: string

      if (data.scenario === "existing") {
        // Find existing user by invitation email
        const user = await tx.user.findUnique({
          where: { email: invitation.email },
          select: { id: true },
        })
        if (!user) {
          throw new Error("USER_NOT_FOUND")
        }
        userId = user.id

      } else {
        // Create new user + credential
        const passwordHash = await bcrypt.hash(data.password, 12)
        const user = await tx.user.create({
          data: {
            email:         invitation.email,
            fullName:      data.fullName,
            emailVerified: true, // invitation email is implicitly verified
            isPlatformAdmin: false,
          },
        })
        await tx.userAccount.create({
          data: {
            userId:            user.id,
            type:              "credentials",
            provider:          "credentials",
            providerAccountId: passwordHash,
          },
        })
        userId = user.id
      }

      // Check not already a member
      const existing = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
      })

      if (existing && !existing.deletedAt) {
        throw new Error("ALREADY_MEMBER")
      }

      // Create or restore membership
      if (existing) {
        await tx.organizationMember.update({
          where: { id: existing.id },
          data: { role: invitation.role, deletedAt: null, acceptedAt: new Date() },
        })
      } else {
        await tx.organizationMember.create({
          data: {
            organizationId: invitation.organizationId,
            userId,
            role:      invitation.role,
            invitedBy: invitation.invitedBy,
            acceptedAt: new Date(),
            isPrimary: false,
          },
        })
      }

      // Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      })

      return {
        userId,
        orgSlug: invitation.organization.slug,
        orgId:   invitation.organization.id,
        orgName: invitation.organization.name,
      }
    })

    return Response.json(result)

  } catch (err: unknown) {
    const msg = (err as Error).message
    if (msg === "USER_NOT_FOUND")  return Response.json({ error: "Kontot hittades inte" }, { status: 404 })
    if (msg === "ALREADY_MEMBER")  return Response.json({ error: "Redan medlem" }, { status: 409 })
    console.error("[invitations/accept]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
