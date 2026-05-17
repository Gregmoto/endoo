/**
 * GET   /api/quotes/[id]  — fetch a single quote
 * PATCH /api/quotes/[id]  — update (draft only) or cancel
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { Prisma }      from "@prisma/client"
import { z }           from "zod"

const EDITABLE_STATUSES = ["draft"] as const
const CANCELLABLE_STATUSES = ["draft", "sent", "viewed"] as const

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx      = await requireAuth()
    canOrThrow(ctx, "quotes:read")
    const { id }   = await params

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        contact:   { select: { id: true, name: true, customerNumber: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    })

    if (!quote) return Response.json({ error: "Hittades inte" }, { status: 404 })
    return Response.json(quote)
  } catch (err) {
    return handleError(err)
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  description:  z.string().min(1).max(1000),
  quantity:     z.number().positive(),
  unit:         z.string().max(30).default("st"),
  unitPriceKr:  z.number().min(0),
  taxRate:      z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1).default(0),
})

const UpdateSchema = z.object({
  // cancel action
  action:       z.literal("cancel").optional(),

  // editable fields
  title:        z.string().max(255).optional().nullable(),
  contactId:    z.string().uuid().optional().nullable(),
  contactName:  z.string().min(1).max(255).optional(),
  contactEmail: z.string().email().optional().nullable(),
  contactAddress: z.string().max(1000).optional().nullable(),
  currency:     z.string().max(3).optional(),
  discount:     z.number().min(0).optional().nullable(),
  discountType: z.enum(["percent", "amount"]).optional().nullable(),
  notes:        z.string().max(5000).optional().nullable(),
  terms:        z.string().max(5000).optional().nullable(),
  internalNote: z.string().max(5000).optional().nullable(),
  validUntil:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  lineItems:    z.array(LineItemSchema).min(1).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx    = await requireAuth()
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!quote) return Response.json({ error: "Hittades inte" }, { status: 404 })

    const body   = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    // Cancel action
    if (parsed.data.action === "cancel") {
      canOrThrow(ctx, "quotes:cancel")
      if (!CANCELLABLE_STATUSES.includes(quote.status as typeof CANCELLABLE_STATUSES[number])) {
        return Response.json({ error: "Kan inte avbryta en offert med denna status" }, { status: 422 })
      }
      const updated = await prisma.quote.update({
        where: { id },
        data:  { status: "cancelled" },
      })
      return Response.json(updated)
    }

    // Update — only drafts can be edited
    canOrThrow(ctx, "quotes:update")
    if (!EDITABLE_STATUSES.includes(quote.status as typeof EDITABLE_STATUSES[number])) {
      return Response.json({ error: "Kan bara redigera utkast" }, { status: 422 })
    }

    const { action: _action, contactAddress, ...rest } = parsed.data
    const updated = await prisma.quote.update({
      where: { id },
      data: {
        ...rest,
        contactAddress: contactAddress !== undefined
          ? (contactAddress ? { text: contactAddress } : Prisma.JsonNull)
          : undefined,
        validUntil: rest.validUntil !== undefined
          ? (rest.validUntil ? new Date(rest.validUntil) : null)
          : undefined,
      },
    })
    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[quotes/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
