/**
 * prisma/seed.ts
 *
 * Skapar tre demo-konton:
 *
 *   super@endoo.se   / Demo1234!   — Super Admin (plattformsadmin)
 *   byra@demo.se     / Demo1234!   — Byrå-ägare  (Demobyrån AB)
 *   kund@demo.se     / Demo1234!   — Kund-ägare  (Demokunden AB)
 *
 * Kör med: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function hash(password: string) {
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log("🌱 Seeding demo accounts…")

  // ── 1. Super Admin ───────────────────────────────────────────────────
  const superHash = await hash("Demo1234!")

  const superUser = await prisma.user.upsert({
    where: { email: "super@endoo.se" },
    update: {},
    create: {
      email: "super@endoo.se",
      fullName: "Super Admin",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isPlatformAdmin: true,
    },
  })

  await prisma.userAccount.upsert({
    where: { provider_providerAccountId: { provider: "credentials", providerAccountId: superHash } },
    update: {},
    create: {
      userId: superUser.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: superHash,
    },
  })

  // ── 2. Byrå ──────────────────────────────────────────────────────────
  const byraHash = await hash("Demo1234!")

  const byraUser = await prisma.user.upsert({
    where: { email: "byra@demo.se" },
    update: {},
    create: {
      email: "byra@demo.se",
      fullName: "Anna Byrå",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isPlatformAdmin: false,
    },
  })

  await prisma.userAccount.upsert({
    where: { provider_providerAccountId: { provider: "credentials", providerAccountId: byraHash } },
    update: {},
    create: {
      userId: byraUser.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: byraHash,
    },
  })

  const byraOrg = await prisma.organization.upsert({
    where: { slug: "demobyran" },
    update: {},
    create: {
      slug: "demobyran",
      name: "Demobyrån AB",
      type: "agency",
      plan: "pro",
      defaultCurrency: "SEK",
      country: "SE",
      locale: "sv-SE",
      timezone: "Europe/Stockholm",
      isActive: true,
      orgNumber: "556000-0001",
      vatNumber: "SE556000000101",
      city: "Stockholm",
    },
  })

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: byraOrg.id, userId: byraUser.id } },
    update: {},
    create: {
      userId: byraUser.id,
      organizationId: byraOrg.id,
      role: "owner",
      isPrimary: true,
      acceptedAt: new Date(),
    },
  })

  // ── 3. Kund ──────────────────────────────────────────────────────────
  const kundHash = await hash("Demo1234!")

  const kundUser = await prisma.user.upsert({
    where: { email: "kund@demo.se" },
    update: {},
    create: {
      email: "kund@demo.se",
      fullName: "Erik Kund",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isPlatformAdmin: false,
    },
  })

  await prisma.userAccount.upsert({
    where: { provider_providerAccountId: { provider: "credentials", providerAccountId: kundHash } },
    update: {},
    create: {
      userId: kundUser.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: kundHash,
    },
  })

  const kundOrg = await prisma.organization.upsert({
    where: { slug: "demokunden" },
    update: {},
    create: {
      slug: "demokunden",
      name: "Demokunden AB",
      type: "customer",
      plan: "starter",
      defaultCurrency: "SEK",
      country: "SE",
      locale: "sv-SE",
      timezone: "Europe/Stockholm",
      isActive: true,
      orgNumber: "556000-0002",
      vatNumber: "SE556000000201",
      city: "Göteborg",
    },
  })

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: kundOrg.id, userId: kundUser.id } },
    update: {},
    create: {
      userId: kundUser.id,
      organizationId: kundOrg.id,
      role: "owner",
      isPrimary: true,
      acceptedAt: new Date(),
    },
  })

  // ── 4. Lägg till demokunden som klient under byrån ────────────────────
  await prisma.agencyClientRelationship.upsert({
    where: { agencyId_clientId: { agencyId: byraOrg.id, clientId: kundOrg.id } },
    update: {},
    create: {
      agencyId: byraOrg.id,
      clientId: kundOrg.id,
      status: "active",
      grantedAt: new Date(),
    },
  })

  // ── 5. Demodata: en kontakt och faktura för kunden ───────────────────
  const contact = await prisma.contact.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: kundOrg.id,
      name: "Exempelkunden HB",
      email: "faktura@exempelkunden.se",
      orgNumber: "969000-0001",
      city: "Malmö",
      country: "SE",
    },
  })

  const invoice = await prisma.invoice.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      organizationId: kundOrg.id,
      contactId: contact.id,
      createdByUserId: kundUser.id,
      invoiceNumber: "INV-0001",
      status: "sent",
      type: "invoice",
      currency: "SEK",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotalAmount: BigInt(10000),
      taxAmount: BigInt(2500),
      totalAmount: BigInt(12500),
    },
  })

  const { Prisma } = await import("@prisma/client")

  await prisma.invoiceLineItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      invoiceId: invoice.id,
      organizationId: kundOrg.id,
      description: "Konsulttjänster april 2026",
      quantity: new Prisma.Decimal(10),
      unitPrice: BigInt(1000),
      taxRate: new Prisma.Decimal(0.25),
      taxAmount: BigInt(2500),
      lineTotal: BigInt(10000),
      sortOrder: 0,
    },
  })

  console.log("")
  console.log("✅ Demo-konton skapade!")
  console.log("")
  console.log("  📧 super@endoo.se   / Demo1234!  → Super Admin  (tillgång till /platform)")
  console.log("  📧 byra@demo.se     / Demo1234!  → Demobyrån AB  (byrå, pro-plan)")
  console.log("  📧 kund@demo.se     / Demo1234!  → Demokunden AB (kund, starter-plan)")
  console.log("")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
