import { describe, it, expect } from "vitest"
import { z } from "zod"

// ─── Schema mirrors ────────────────────────────────────────────────────────────
// These Zod schemas replicate the ones used in the settings API routes.
// Testing them in isolation verifies input validation without hitting the DB.

const CompanySchema = z.object({
  name:            z.string().min(1).max(255).optional(),
  orgNumber:       z.string().max(20).optional().nullable(),
  vatNumber:       z.string().max(30).optional().nullable(),
  contactEmail:    z.string().email().max(255).optional().nullable(),
  phone:           z.string().max(30).optional().nullable(),
  website:         z.string().max(255).optional().nullable(),
  addressLine1:    z.string().max(255).optional().nullable(),
  city:            z.string().max(100).optional().nullable(),
  postalCode:      z.string().max(20).optional().nullable(),
  country:         z.string().length(2).optional(),
  locale:          z.string().max(10).optional(),
  timezone:        z.string().max(50).optional(),
  defaultCurrency: z.enum(["SEK", "EUR", "USD", "NOK", "DKK", "GBP"]).optional(),
  primaryColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
})

const InvoiceSettingsSchema = z.object({
  invoicePrefix:           z.string().max(20).optional(),
  invoiceSequenceStart:    z.number().int().min(1).optional(),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
  defaultTaxRate:          z.number().min(0).max(1).optional(),
  defaultCurrency:         z.enum(["SEK", "EUR", "USD", "NOK", "DKK", "GBP"]).optional(),
  pricesIncludeTax:        z.boolean().optional(),
  roundingMode:            z.enum(["none", "nearest", "up", "down"]).optional(),
  defaultNotes:            z.string().max(2000).optional(),
  defaultFooter:           z.string().max(500).optional(),
})

const EmailSettingsSchema = z.object({
  senderName:      z.string().max(100).optional(),
  senderAddress:   z.string().email().max(255).optional().or(z.literal("")),
  replyTo:         z.string().email().max(255).optional().or(z.literal("")),
  invoiceSubject:  z.string().max(255).optional(),
  invoiceBody:     z.string().max(5000).optional(),
  reminderSubject: z.string().max(255).optional(),
  reminderBody:    z.string().max(5000).optional(),
})

// ─── Company settings validation ──────────────────────────────────────────────

describe("company settings schema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(CompanySchema.safeParse({}).success).toBe(true)
  })

  it("accepts valid full payload", () => {
    const result = CompanySchema.safeParse({
      name:            "Acme AB",
      orgNumber:       "556000-0000",
      vatNumber:       "SE556000000001",
      contactEmail:    "info@acme.se",
      country:         "SE",
      defaultCurrency: "SEK",
      primaryColor:    "#4f46e5",
    })
    expect(result.success).toBe(true)
  })

  it("rejects name longer than 255 chars", () => {
    expect(CompanySchema.safeParse({ name: "x".repeat(256) }).success).toBe(false)
  })

  it("rejects invalid email", () => {
    expect(CompanySchema.safeParse({ contactEmail: "not-an-email" }).success).toBe(false)
  })

  it("rejects country code that is not 2 chars", () => {
    expect(CompanySchema.safeParse({ country: "SWE" }).success).toBe(false)
    expect(CompanySchema.safeParse({ country: "S"   }).success).toBe(false)
    expect(CompanySchema.safeParse({ country: "SE"  }).success).toBe(true)
  })

  it("rejects invalid primary color", () => {
    expect(CompanySchema.safeParse({ primaryColor: "red"      }).success).toBe(false)
    expect(CompanySchema.safeParse({ primaryColor: "#gggggg"  }).success).toBe(false)
    expect(CompanySchema.safeParse({ primaryColor: "#4f46e5"  }).success).toBe(true)
    expect(CompanySchema.safeParse({ primaryColor: "#4F46E5"  }).success).toBe(true)
  })

  it("rejects unsupported currency", () => {
    expect(CompanySchema.safeParse({ defaultCurrency: "BTC" }).success).toBe(false)
    expect(CompanySchema.safeParse({ defaultCurrency: "SEK" }).success).toBe(true)
  })

  it("allows null for nullable fields", () => {
    const result = CompanySchema.safeParse({
      orgNumber: null, vatNumber: null, contactEmail: null, primaryColor: null,
    })
    expect(result.success).toBe(true)
  })
})

// ─── Invoice settings validation ──────────────────────────────────────────────

describe("invoice settings schema", () => {
  it("accepts valid partial update", () => {
    expect(InvoiceSettingsSchema.safeParse({
      defaultPaymentTermsDays: 30,
      defaultTaxRate:          0.25,
      defaultCurrency:         "EUR",
    }).success).toBe(true)
  })

  it("rejects payment terms below 0", () => {
    expect(InvoiceSettingsSchema.safeParse({ defaultPaymentTermsDays: -1 }).success).toBe(false)
  })

  it("rejects payment terms above 365", () => {
    expect(InvoiceSettingsSchema.safeParse({ defaultPaymentTermsDays: 366 }).success).toBe(false)
  })

  it("rejects tax rate above 1", () => {
    expect(InvoiceSettingsSchema.safeParse({ defaultTaxRate: 1.01 }).success).toBe(false)
  })

  it("rejects tax rate below 0", () => {
    expect(InvoiceSettingsSchema.safeParse({ defaultTaxRate: -0.01 }).success).toBe(false)
  })

  it("rejects invalid rounding mode", () => {
    expect(InvoiceSettingsSchema.safeParse({ roundingMode: "random" }).success).toBe(false)
  })

  it("rejects non-integer sequenceStart", () => {
    expect(InvoiceSettingsSchema.safeParse({ invoiceSequenceStart: 1.5 }).success).toBe(false)
    expect(InvoiceSettingsSchema.safeParse({ invoiceSequenceStart: 1   }).success).toBe(true)
  })

  it("rejects sequenceStart below 1", () => {
    expect(InvoiceSettingsSchema.safeParse({ invoiceSequenceStart: 0 }).success).toBe(false)
  })
})

// ─── Email settings validation ────────────────────────────────────────────────

describe("email settings schema", () => {
  it("accepts valid email addresses", () => {
    expect(EmailSettingsSchema.safeParse({ senderAddress: "noreply@endoo.se" }).success).toBe(true)
    expect(EmailSettingsSchema.safeParse({ replyTo:       "support@endoo.se" }).success).toBe(true)
  })

  it("allows empty string for email fields (clearing the setting)", () => {
    expect(EmailSettingsSchema.safeParse({ senderAddress: "" }).success).toBe(true)
    expect(EmailSettingsSchema.safeParse({ replyTo:       "" }).success).toBe(true)
  })

  it("rejects invalid email that is not empty", () => {
    expect(EmailSettingsSchema.safeParse({ senderAddress: "not-email" }).success).toBe(false)
    expect(EmailSettingsSchema.safeParse({ replyTo:       "also-bad"  }).success).toBe(false)
  })

  it("rejects subject longer than 255 chars", () => {
    expect(EmailSettingsSchema.safeParse({ invoiceSubject: "x".repeat(256) }).success).toBe(false)
  })

  it("rejects body longer than 5000 chars", () => {
    expect(EmailSettingsSchema.safeParse({ invoiceBody: "x".repeat(5001) }).success).toBe(false)
    expect(EmailSettingsSchema.safeParse({ invoiceBody: "x".repeat(5000) }).success).toBe(true)
  })
})
