import { prisma } from "@/lib/prisma"

export async function seedInvoicingDefaults(orgId: string): Promise<void> {
  // Payment terms
  await prisma.paymentTerm.createMany({
    data: [
      { organizationId: orgId, code: "NET0",  name: "Kontant",    days: 0,  sortOrder: 0, isActive: true, isDefault: false },
      { organizationId: orgId, code: "NET10", name: "10 dagar",   days: 10, sortOrder: 1, isActive: true, isDefault: false },
      { organizationId: orgId, code: "NET15", name: "15 dagar",   days: 15, sortOrder: 2, isActive: true, isDefault: false },
      { organizationId: orgId, code: "NET20", name: "20 dagar",   days: 20, sortOrder: 3, isActive: true, isDefault: false },
      { organizationId: orgId, code: "NET30", name: "30 dagar",   days: 30, sortOrder: 4, isActive: true, isDefault: true  },
      { organizationId: orgId, code: "NET45", name: "45 dagar",   days: 45, sortOrder: 5, isActive: true, isDefault: false },
      { organizationId: orgId, code: "NET60", name: "60 dagar",   days: 60, sortOrder: 6, isActive: true, isDefault: false },
      { organizationId: orgId, code: "NET90", name: "90 dagar",   days: 90, sortOrder: 7, isActive: true, isDefault: false },
    ],
    skipDuplicates: true,
  })

  // Units
  await prisma.unit.createMany({
    data: [
      { organizationId: orgId, code: "st",  name: "Styck",        sortOrder: 0, isActive: true, isDefault: true  },
      { organizationId: orgId, code: "tim", name: "Timmar",        sortOrder: 1, isActive: true, isDefault: false },
      { organizationId: orgId, code: "dag", name: "Dagar",         sortOrder: 2, isActive: true, isDefault: false },
      { organizationId: orgId, code: "mån", name: "Månader",       sortOrder: 3, isActive: true, isDefault: false },
      { organizationId: orgId, code: "kg",  name: "Kilogram",      sortOrder: 4, isActive: true, isDefault: false },
      { organizationId: orgId, code: "m",   name: "Meter",         sortOrder: 5, isActive: true, isDefault: false },
      { organizationId: orgId, code: "m2",  name: "Kvadratmeter",  sortOrder: 6, isActive: true, isDefault: false },
      { organizationId: orgId, code: "l",   name: "Liter",         sortOrder: 7, isActive: true, isDefault: false },
    ],
    skipDuplicates: true,
  })

  // Currencies (OrgCurrency has no name or sortOrder fields)
  await prisma.orgCurrency.createMany({
    data: [
      { organizationId: orgId, code: "SEK", symbol: "kr", isActive: true, isDefault: true  },
      { organizationId: orgId, code: "EUR", symbol: "€",  isActive: true, isDefault: false },
      { organizationId: orgId, code: "USD", symbol: "$",  isActive: true, isDefault: false },
      { organizationId: orgId, code: "GBP", symbol: "£",  isActive: true, isDefault: false },
      { organizationId: orgId, code: "NOK", symbol: "kr", isActive: true, isDefault: false },
      { organizationId: orgId, code: "DKK", symbol: "kr", isActive: true, isDefault: false },
    ],
    skipDuplicates: true,
  })

  // Delivery methods
  await prisma.deliveryMethod.createMany({
    data: [
      { organizationId: orgId, code: "POST",    name: "Post",           sortOrder: 0, isActive: true, isDefault: false },
      { organizationId: orgId, code: "EMAIL",   name: "E-post",         sortOrder: 1, isActive: true, isDefault: true  },
      { organizationId: orgId, code: "PICKUP",  name: "Upphämtning",    sortOrder: 2, isActive: true, isDefault: false },
      { organizationId: orgId, code: "COURIER", name: "Budtjänst",      sortOrder: 3, isActive: true, isDefault: false },
      { organizationId: orgId, code: "EDI",     name: "EDI/elektronisk",sortOrder: 4, isActive: true, isDefault: false },
    ],
    skipDuplicates: true,
  })

  // Delivery terms (Incoterms + svenska)
  await prisma.deliveryTerms.createMany({
    data: [
      { organizationId: orgId, code: "EXW",  name: "EXW – Ex Works",                        sortOrder: 0,  isActive: true,  isDefault: false },
      { organizationId: orgId, code: "FCA",  name: "FCA – Free Carrier",                    sortOrder: 1,  isActive: true,  isDefault: false },
      { organizationId: orgId, code: "CPT",  name: "CPT – Carriage Paid To",                sortOrder: 2,  isActive: true,  isDefault: false },
      { organizationId: orgId, code: "CIP",  name: "CIP – Carriage and Insurance Paid",     sortOrder: 3,  isActive: true,  isDefault: false },
      { organizationId: orgId, code: "DAP",  name: "DAP – Delivered at Place",              sortOrder: 4,  isActive: true,  isDefault: false },
      { organizationId: orgId, code: "DPU",  name: "DPU – Delivered at Place Unloaded",     sortOrder: 5,  isActive: true,  isDefault: false },
      { organizationId: orgId, code: "DDP",  name: "DDP – Delivered Duty Paid",             sortOrder: 6,  isActive: true,  isDefault: false },
      { organizationId: orgId, code: "FAS",  name: "FAS – Free Alongside Ship",             sortOrder: 7,  isActive: false, isDefault: false },
      { organizationId: orgId, code: "FOB",  name: "FOB – Free on Board",                   sortOrder: 8,  isActive: false, isDefault: false },
      { organizationId: orgId, code: "CFR",  name: "CFR – Cost and Freight",                sortOrder: 9,  isActive: false, isDefault: false },
      { organizationId: orgId, code: "CIF",  name: "CIF – Cost, Insurance and Freight",     sortOrder: 10, isActive: false, isDefault: false },
      { organizationId: orgId, code: "LEVE", name: "Leverans inkl. frakt",                  sortOrder: 11, isActive: true,  isDefault: true  },
    ],
    skipDuplicates: true,
  })

  // Default price list (PriceList has no code field — use name as identifier)
  const existingPriceList = await prisma.priceList.findFirst({
    where: { organizationId: orgId, name: "Standardprislista" },
  })
  if (!existingPriceList) {
    await prisma.priceList.create({
      data: {
        organizationId: orgId,
        name:      "Standardprislista",
        currency:  "SEK",
        isActive:  true,
        isDefault: true,
      },
    })
  }

  // Default invoice template (InvoiceTemplate2 has no code field)
  const existingTemplate = await prisma.invoiceTemplate2.findFirst({
    where: { organizationId: orgId, name: "Standardmall" },
  })
  if (!existingTemplate) {
    await prisma.invoiceTemplate2.create({
      data: {
        organizationId: orgId,
        name:      "Standardmall",
        isActive:  true,
        isDefault: true,
      },
    })
  }

  // Invoicing settings defaults — only set if prefix not already configured
  const org = await prisma.organization.findFirst({
    where:  { id: orgId },
    select: { invoicePrefix: true },
  })
  if (org && !org.invoicePrefix) {
    await prisma.organization.update({
      where: { id: orgId },
      data:  {
        invoicePrefix:           "F",
        invoiceSequenceStart:    1,
        defaultCurrency:         "SEK",
        defaultTaxRate:          25,
        defaultPaymentTermsDays: 30,
        invoicingSettings:       {
          roundingMode:      "auto",
          priceIncludesVat:  false,
          invoiceLang:       "sv",
          showProductImages: false,
          reminderEnabled:   false,
          reminderDays:      [7, 14],
          interestRate:      8,
          reminderFee:       0,
          dueDateMode:       "payment_terms",
        },
      },
    })
  }
}
