import { prisma } from "@/lib/prisma"

const BAS_DEFAULTS: Record<string, {
  salesAccount:  string
  vatAccountOut: string
  vatAccountIn?: string
  description:   string
}> = {
  SE25:         { salesAccount: "3001", vatAccountOut: "2611", vatAccountIn: "2640", description: "Försäljning SE 25%" },
  SE12:         { salesAccount: "3002", vatAccountOut: "2621", vatAccountIn: "2640", description: "Försäljning SE 12%" },
  SE06:         { salesAccount: "3003", vatAccountOut: "2631", vatAccountIn: "2640", description: "Försäljning SE 6%" },
  SE00:         { salesAccount: "3004", vatAccountOut: "",                           description: "Försäljning SE momsfri" },
  EU_VARU:      { salesAccount: "3108", vatAccountOut: "2614", vatAccountIn: "2645", description: "EU-försäljning varor" },
  EU_TJANST:    { salesAccount: "3109", vatAccountOut: "2614",                       description: "EU-försäljning tjänster" },
  EXPORT:       { salesAccount: "3105", vatAccountOut: "",                           description: "Export utanför EU" },
  OMVMOMS_BYGG: { salesAccount: "3231", vatAccountOut: "2618", vatAccountIn: "2647", description: "Omvänd skattskyldighet bygg" },
  OMVMOMS_SE:   { salesAccount: "3231", vatAccountOut: "2618",                       description: "Omvänd skattskyldighet SE" },
}

export { BAS_DEFAULTS }

export async function getAccountMapping(
  orgId:   string,
  vatType: string,
): Promise<{ salesAccount: string; vatAccountOut: string; vatAccountIn?: string | null } | null> {
  return prisma.accountMapping.findUnique({
    where: { organizationId_vatTypeCode: { organizationId: orgId, vatTypeCode: vatType } },
    select: { salesAccount: true, vatAccountOut: true, vatAccountIn: true },
  })
}

export async function getSalesAccount(
  orgId:           string,
  vatType:         string,
  productOverride?: string | null,
  contactOverride?: string | null,
): Promise<string> {
  if (contactOverride) return contactOverride
  if (productOverride) return productOverride

  const dbMapping = await getAccountMapping(orgId, vatType)
  if (dbMapping) return dbMapping.salesAccount

  return BAS_DEFAULTS[vatType]?.salesAccount ?? "3001"
}

export async function getOrCreateDefaultMappings(orgId: string): Promise<void> {
  await Promise.all(
    Object.entries(BAS_DEFAULTS).map(([vatTypeCode, def]) =>
      prisma.accountMapping.upsert({
        where: { organizationId_vatTypeCode: { organizationId: orgId, vatTypeCode } },
        update: {},
        create: {
          organizationId: orgId,
          vatTypeCode,
          salesAccount:  def.salesAccount,
          vatAccountOut: def.vatAccountOut,
          vatAccountIn:  def.vatAccountIn ?? null,
          description:   def.description,
        },
      }),
    ),
  )
}
