import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

interface ArticleNumberSettings {
  articleNumberMode:       "auto" | "manual"
  articleNumberPrefix:     string
  articleNumberNextValue:  number
  articleNumberMinDigits:  number
  articleNumberFormat:     "numeric" | "alphanumeric" | "random"
}

function getSettings(raw: unknown): ArticleNumberSettings {
  const s = (raw ?? {}) as Record<string, unknown>
  return {
    articleNumberMode:      (s.articleNumberMode as string) === "manual" ? "manual" : "auto",
    articleNumberPrefix:    (s.articleNumberPrefix as string) ?? "",
    articleNumberNextValue: Number(s.articleNumberNextValue) || 1000,
    articleNumberMinDigits: Number(s.articleNumberMinDigits) || 4,
    articleNumberFormat:    (["numeric", "alphanumeric", "random"].includes(s.articleNumberFormat as string)
      ? s.articleNumberFormat as "numeric" | "alphanumeric" | "random"
      : "numeric"),
  }
}

function generateRandomSuffix(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const bytes = randomBytes(length)
  return Array.from(bytes).map(b => chars[b % chars.length]).join("")
}

export async function generateArticleNumber(organizationId: string): Promise<string | null> {
  return prisma.$transaction(
    async (tx) => {
      const org = await tx.organization.findUnique({
        where:  { id: organizationId },
        select: { invoicingSettings: true },
      })
      if (!org) return null

      const settings = getSettings(org.invoicingSettings)
      if (settings.articleNumberMode === "manual") return null

      const n      = settings.articleNumberNextValue
      const prefix = settings.articleNumberPrefix

      let suffix: string
      if (settings.articleNumberFormat === "alphanumeric") {
        suffix = n.toString(36).toUpperCase()
      } else if (settings.articleNumberFormat === "random") {
        suffix = generateRandomSuffix(6)
      } else {
        suffix = String(n).padStart(settings.articleNumberMinDigits, "0")
      }

      const result = `${prefix}${suffix}`

      if (settings.articleNumberFormat !== "random") {
        const updated = (org.invoicingSettings as Record<string, unknown>) ?? {}
        await tx.organization.update({
          where: { id: organizationId },
          data:  { invoicingSettings: { ...updated, articleNumberNextValue: n + 1 } },
        })
      }

      return result
    },
    { isolationLevel: "Serializable" },
  )
}

export async function isArticleNumberTaken(
  organizationId: string,
  sku:             string,
  excludeId?:      string,
): Promise<boolean> {
  const count = await prisma.product.count({
    where: {
      organizationId,
      sku,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  return count > 0
}
