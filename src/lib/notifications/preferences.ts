import { prisma } from "@/lib/prisma"

// Defaults per category — applies when no preference row exists.
const CATEGORY_DEFAULTS: Record<string, { inApp: boolean; email: boolean; emailDigest: boolean }> = {
  invoices:           { inApp: true,  email: true,  emailDigest: false },
  payments:           { inApp: true,  email: true,  emailDigest: false },
  supplier_invoices:  { inApp: true,  email: true,  emailDigest: false },
  approvals:          { inApp: true,  email: true,  emailDigest: false },
  accounting:         { inApp: true,  email: true,  emailDigest: false },
  vat:                { inApp: true,  email: true,  emailDigest: false },
  contracts:          { inApp: true,  email: true,  emailDigest: false },
  billing:            { inApp: true,  email: true,  emailDigest: false },
  team:               { inApp: true,  email: false, emailDigest: false },
  system:             { inApp: true,  email: false, emailDigest: false },
}

const FALLBACK = { inApp: true, email: true, emailDigest: false }

export async function getPreference(
  userId:         string,
  organizationId: string,
  category:       string,
): Promise<{ inApp: boolean; email: boolean; emailDigest: boolean }> {
  const row = await prisma.notificationPreference.findUnique({
    where: { userId_organizationId_category: { userId, organizationId, category } },
  })
  if (row) return { inApp: row.inApp, email: row.email, emailDigest: row.emailDigest }
  return CATEGORY_DEFAULTS[category] ?? FALLBACK
}

// Batch version — used by router to avoid N+1 queries per recipient.
export async function getPreferencesBatch(
  recipients: Array<{ userId: string }>,
  organizationId: string,
  category: string,
): Promise<Map<string, { inApp: boolean; email: boolean; emailDigest: boolean }>> {
  const userIds = recipients.map((r) => r.userId)
  const rows = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, organizationId, category },
  })
  const byUser = new Map(rows.map((r) => [r.userId, r]))
  const defaults = CATEGORY_DEFAULTS[category] ?? FALLBACK
  const result = new Map<string, { inApp: boolean; email: boolean; emailDigest: boolean }>()
  for (const userId of userIds) {
    const row = byUser.get(userId)
    result.set(userId, row ? { inApp: row.inApp, email: row.email, emailDigest: row.emailDigest } : defaults)
  }
  return result
}

export { CATEGORY_DEFAULTS }
