/**
 * GET  /api/settings/users  — list members + pending invitations
 * POST /api/settings/users  — invite a new member
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { writeAuditLog } from "@/lib/tenant-db"
import { z } from "zod"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "users:read")

    const [members, invitations] = await Promise.all([
      prisma.organizationMember.findMany({
        where: { organizationId: ctx.organizationId, deletedAt: null },
        select: {
          id:        true,
          role:      true,
          isPrimary: true,
          acceptedAt:true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true, lastLoginAt: true } },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      }),
      prisma.invitation.findMany({
        where: {
          organizationId: ctx.organizationId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id:        true,
          email:     true,
          role:      true,
          expiresAt: true,
          createdAt: true,
          invitedByUser: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return Response.json({ members, invitations })
  } catch (err) {
    return handleError(err)
  }
}

const InviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(["admin", "member", "viewer"]),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "users:invite")

    const body = await req.json()
    const parsed = InviteSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltig e-post eller roll" }, { status: 400 })
    }

    const { email, role } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // Check if already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existingUser) {
      const existing = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: ctx.organizationId,
            userId: existingUser.id,
          },
        },
      })
      if (existing && !existing.deletedAt) {
        return Response.json({ error: "Användaren är redan medlem" }, { status: 409 })
      }
    }

    const invitation = await prisma.invitation.upsert({
      where: { organizationId_email: { organizationId: ctx.organizationId, email: normalizedEmail } },
      create: { organizationId: ctx.organizationId, email: normalizedEmail, role, invitedBy: ctx.userId },
      update: {
        role,
        invitedBy: ctx.userId,
        acceptedAt: null,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await writeAuditLog({
      ctx,
      action: "invite_send",
      entityType: "invitation",
      entityId: invitation.id,
      meta: { email: normalizedEmail, role },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    })

    return Response.json({
      id:        invitation.id,
      email:     invitation.email,
      role:      invitation.role,
      expiresAt: invitation.expiresAt,
      inviteUrl: `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`,
    }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[settings/users]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
