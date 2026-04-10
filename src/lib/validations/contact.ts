import { z } from "zod"

export const CreateContactSchema = z.object({
  type:        z.enum(["business", "individual"]).default("business"),
  name:        z.string().min(1).max(200),
  email:       z.string().email().optional().or(z.literal("")),
  phone:       z.string().max(50).optional(),
  vatNumber:   z.string().max(50).optional(),
  orgNumber:   z.string().max(20).optional(),
  addressLine1:z.string().max(200).optional(),
  addressLine2:z.string().max(200).optional(),
  city:        z.string().max(100).optional(),
  postalCode:  z.string().max(20).optional(),
  country:     z.string().length(2).default("SE"),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
  defaultTaxRate: z.number().min(0).max(1).optional(),
  notes:       z.string().max(2000).optional(),
  tags:        z.array(z.string()).default([]),
})

export const UpdateContactSchema = CreateContactSchema.partial()

export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
