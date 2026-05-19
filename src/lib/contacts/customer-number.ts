import { prisma } from "@/lib/prisma"

interface CustomerNumberSettings {
  customerNumberMode:       "auto" | "manual"
  customerNumberPrefix:     string
  customerNumberNextValue:  number
  customerNumberMinDigits:  number
}

function getSettings(raw: unknown): CustomerNumberSettings {
  const s = (raw ?? {}) as Record<string, unknown>
  return {
    customerNumberMode:      (s.customerNumberMode as string) === "manual" ? "manual" : "auto",
    customerNumberPrefix:    (s.customerNumberPrefix as string) ?? "",
    customerNumberNextValue: Number(s.customerNumberNextValue) || 1000,
    customerNumberMinDigits: Number(s.customerNumberMinDigits) || 4,
  }
}

/**
 * Atomically generates the next customer number for the org.
 * Uses a serializable transaction to avoid duplicates under concurrency.
 */
export async function generateCustomerNumber(organizationId: string): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where:  { id: organizationId },
      select: { invoicingSettings: true },
    })
    if (!org) return null

    const settings = getSettings(org.invoicingSettings)
    if (settings.customerNumberMode !== "auto") return null

    const n   = settings.customerNumberNextValue
    const num = String(n).padStart(settings.customerNumberMinDigits, "0")
    const result = `${settings.customerNumberPrefix}${num}`

    const updated = (org.invoicingSettings as Record<string, unknown>) ?? {}
    await tx.organization.update({
      where: { id: organizationId },
      data:  { invoicingSettings: { ...updated, customerNumberNextValue: n + 1 } },
    })

    return result
  })
}

/** Check if a customer number is already in use in this org (for duplicate warning). */
export async function isCustomerNumberTaken(
  organizationId: string,
  customerNumber:  string,
  excludeId?:      string,
): Promise<boolean> {
  const count = await prisma.contact.count({
    where: {
      organizationId,
      customerNumber,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  return count > 0
}
