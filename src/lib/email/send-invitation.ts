import React from "react"
import { prisma }     from "@/lib/prisma"
import { sendEmail }  from "./send"
import { InvitationEmail } from "@/emails/InvitationEmail"

const ROLE_LABELS: Record<string, string> = {
  owner:  "Ägare",
  admin:  "Administratör",
  member: "Medlem",
  viewer: "Observatör",
}

export type SendInvitationOptions = {
  organizationId: string
  invitedByUserId: string
  recipientEmail:  string
  role:            string
  token:           string
  expiresAt:       Date
}

export async function sendInvitationEmail(opts: SendInvitationOptions): Promise<void> {
  const { organizationId, invitedByUserId, recipientEmail, role, token, expiresAt } = opts

  const [org, inviter, suppressed] = await Promise.all([
    prisma.organization.findUnique({
      where:  { id: organizationId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where:  { id: invitedByUserId },
      select: { fullName: true },
    }),
    prisma.emailSuppression.findUnique({
      where: { organizationId_email: { organizationId, email: recipientEmail } },
    }),
  ])

  if (suppressed) {
    console.warn("[send-invitation] suppressed:", recipientEmail, suppressed.reason)
    return
  }

  const appUrl    = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://app.endoo.se"
  const acceptUrl = `${appUrl}/invite/${token}`
  const orgName   = org?.name ?? "Endoo"
  const roleLabel = ROLE_LABELS[role] ?? role

  const subject = `${inviter?.fullName ?? "Någon"} bjuder in dig till ${orgName} på Endoo`

  const result = await sendEmail({
    to:      recipientEmail,
    subject,
    react:   React.createElement(InvitationEmail, {
      inviterName: inviter?.fullName ?? "En administratör",
      orgName,
      role:        roleLabel,
      acceptUrl,
      expiresAt:   expiresAt.toLocaleDateString("sv-SE"),
    }),
    tags: [
      { name: "type",    value: "invitation"    },
      { name: "org_id",  value: organizationId  },
    ],
    idempotencyKey: `invitation-${token}`,
  })

  // Log delivery for webhook tracking
  await prisma.emailDelivery.create({
    data: {
      organizationId,
      recipientEmail,
      subject,
      providerMessageId: result.id   ?? null,
      status:            result.error ? "queued" : "sent",
      errorMessage:      result.error ?? null,
    },
  })

  if (result.error) {
    // Non-fatal — invitation row already exists, staff can resend manually
    console.error("[send-invitation] delivery failed:", result.error)
  }
}
