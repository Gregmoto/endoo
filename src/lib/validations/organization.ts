import { z } from "zod"
import { slugify } from "@/lib/utils"

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["agency", "customer"]),
  slug: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/).optional(),
  orgNumber: z.string().max(20).optional(),
  vatNumber: z.string().max(50).optional(),
  country:   z.string().length(2).default("SE"),
  currency:  z.string().length(3).default("SEK"),
}).transform((data) => ({
  ...data,
  slug: data.slug ?? slugify(data.name),
}))

export const UpdateOrganizationSchema = z.object({
  name:         z.string().min(1).max(200).optional(),
  orgNumber:    z.string().max(20).optional(),
  vatNumber:    z.string().max(50).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city:         z.string().max(100).optional(),
  postalCode:   z.string().max(20).optional(),
  country:      z.string().length(2).optional(),
  currency:     z.string().length(3).optional(),
  logoUrl:      z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  invoicePrefix:z.string().max(10).optional(),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
  defaultTaxRate: z.number().min(0).max(1).optional(),
  bankgiro:     z.string().max(20).optional(),
  plusgiro:     z.string().max(20).optional(),
  iban:         z.string().max(34).optional(),
  bic:          z.string().max(11).optional(),
})

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>
