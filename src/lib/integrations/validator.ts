/**
 * Zod validation schemas for mapped integration entities.
 * Called before persisting any mapped data to catch connector bugs early.
 */

import { z } from "zod"

const öre = z.number().int().nonnegative()

export const MappedContactSchema = z.object({
  externalId:  z.string().min(1),
  name:        z.string().min(1),
  email:       z.string().email().nullable().optional(),
  phone:       z.string().nullable().optional(),
  orgNumber:   z.string().nullable().optional(),
  vatNumber:   z.string().nullable().optional(),
  address:     z.string().nullable().optional(),
  city:        z.string().nullable().optional(),
  postalCode:  z.string().nullable().optional(),
  country:     z.string().length(2).nullable().optional(),
})

export const MappedInvoiceLineItemSchema = z.object({
  description: z.string().min(1),
  quantity:    z.number().positive(),
  unitPrice:   öre,
  vatRate:     z.number().min(0).max(100),
  accountCode: z.string().nullable().optional(),
})

export const MappedInvoiceSchema = z.object({
  externalId:          z.string().min(1),
  externalNumber:      z.string().min(1),
  contactId:           z.string().nullable().optional(),
  contactExternalId:   z.string().nullable().optional(),
  issueDate:           z.date(),
  dueDate:             z.date(),
  currency:            z.string().length(3),
  lineItems:           z.array(MappedInvoiceLineItemSchema).min(1),
  totalAmount:         öre,
  status:              z.enum(["draft", "sent", "paid", "void", "overdue"]),
})

export const MappedPaymentSchema = z.object({
  externalId:        z.string().min(1),
  invoiceExternalId: z.string().min(1),
  amount:            öre,
  currency:          z.string().length(3),
  paidAt:            z.date(),
  method:            z.string().nullable().optional(),
})

export type ValidationResult<T> =
  | { ok: true;  data: T }
  | { ok: false; errors: string[] }

export function validateContact(raw: unknown): ValidationResult<z.infer<typeof MappedContactSchema>> {
  const result = MappedContactSchema.safeParse(raw)
  if (result.success) return { ok: true, data: result.data }
  return { ok: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) }
}

export function validateInvoice(raw: unknown): ValidationResult<z.infer<typeof MappedInvoiceSchema>> {
  const result = MappedInvoiceSchema.safeParse(raw)
  if (result.success) return { ok: true, data: result.data }
  return { ok: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) }
}

export function validatePayment(raw: unknown): ValidationResult<z.infer<typeof MappedPaymentSchema>> {
  const result = MappedPaymentSchema.safeParse(raw)
  if (result.success) return { ok: true, data: result.data }
  return { ok: false, errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`) }
}
