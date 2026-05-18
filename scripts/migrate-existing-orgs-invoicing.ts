/**
 * Idempotent backfill: seed invoicing defaults for all existing organizations.
 * Safe to run multiple times — uses skipDuplicates and existence checks.
 *
 * Usage: npx tsx scripts/migrate-existing-orgs-invoicing.ts
 */

import { prisma } from "../src/lib/prisma"
import { seedInvoicingDefaults } from "../src/lib/invoicing/seed"

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Seeding invoicing defaults for ${orgs.length} organization(s)...`)

  let ok = 0
  let failed = 0
  for (const org of orgs) {
    try {
      await seedInvoicingDefaults(org.id)
      console.log(`  ✓ ${org.name} (${org.id})`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${org.name} (${org.id}): ${e}`)
      failed++
    }
  }

  console.log(`\nDone: ${ok} ok, ${failed} failed.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
