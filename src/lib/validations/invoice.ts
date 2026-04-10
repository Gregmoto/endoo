import { z } from "zod"

export const LineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity:    z.number().positive().max(99999),
  unit:        z.string().default("piece"),
  unitPrice:   z.number().min(0),             // in SEK (converted to öre in handler)
  taxRate:     z.number().min(0).max(1).default(0.25),
  discountRate:z.number().min(0).max(1).default(0),
  productId:   z.string().uuid().optional(),
})

export const CreateInvoiceSchema = z.object({
  contactId:    z.string().uuid().optional(),
  type:         z.enum(["invoice", "credit_note", "quote", "proforma"]).default("invoice"),
  currency:     z.string().length(3).default("SEK"),
  issueDate:    z.string().date(),
  dueDate:      z.string().date(),
  lineItems:    z.array(LineItemSchema).min(1),
  notes:        z.string().max(2000).optional(),
  footerText:   z.string().max(1000).optional(),
  poNumber:     z.string().max(100).optional(),
  reference:    z.string().max(100).optional(),
  creditedInvoiceId: z.string().uuid().optional(),
})

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial()

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>
export type LineItemInput = z.infer<typeof LineItemSchema>
