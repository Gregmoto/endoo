import { prisma } from "@/lib/prisma"
import type { Recipient } from "./types"

// Org owners + admins — the most common recipient group for system events.
export async function resolveOrgAdmins(organizationId: string): Promise<Recipient[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      role: { in: ["owner", "admin"] },
      deletedAt: null,
    },
    select: { userId: true },
  })
  return members.map((m) => ({ userId: m.userId, reason: "role_admin" as const }))
}

// Org owners + admins + a specific user (e.g. invoice creator).
export async function resolveOrgAdminsPlusUser(
  organizationId: string,
  userId: string | null | undefined,
): Promise<Recipient[]> {
  const admins = await resolveOrgAdmins(organizationId)
  if (!userId) return admins
  const alreadyIncluded = admins.some((r) => r.userId === userId)
  if (alreadyIncluded) return admins
  return [...admins, { userId, reason: "entity_owner" as const }]
}

// Explicit list (e.g. ApprovalStep.resolvedApproverIds).
export function resolveExplicitList(userIds: string[]): Recipient[] {
  return [...new Set(userIds)].map((userId) => ({
    userId,
    reason: "explicit_approver" as const,
  }))
}

// Deduplicate a recipient list, keeping the first reason for each userId.
export function deduplicateRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>()
  return recipients.filter(({ userId }) => {
    if (seen.has(userId)) return false
    seen.add(userId)
    return true
  })
}
