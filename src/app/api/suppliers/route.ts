/**
 * GET  /api/suppliers  — list suppliers
 * POST /api/suppliers  — create supplier
 */

import { NextRequest }                  from "next/server"
import { requireAuth }                  from "@/lib/rbac/guards"
import { canOrThrow }                   from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }                       from "@/lib/prisma"
import { Prisma }                       from "@prisma/client"
import { z }                            from "zod"

const CreateSchema = z.object({
  name:                       z.string().min(1).max(200),
  orgNumber:                  z.string().max(20).optional().nullable(),
  vatNumber:                  z.string().max(30).optional().nullable(),
  email:                      z.string().email().optional().nullable(),
  phone:                      z.string().max(30).optional().nullable(),
  bankgiro:                   z.string().max(20).optional().nullable(),
  plusgiro:                   z.string().max(20).optional().nullable(),
  iban:                       z.string().max(40).optional().nullable(),
  paymentTermsDays:           z.number().int().min(0).max(365).default(30),
  defaultExpenseAccountNumber: z.string().max(10).optional().nullable(),
  address:                    z.record(z.string(), z.unknown()).optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.READ)
    const search = req.nextUrl.searchParams.get("search") ?? undefined

    const suppliers = await prisma.supplier.findMany({
      where: {
        organizationId: ctx.organizationId,
        isActive:       true,
        ...(search && {
          OR: [
            { name:      { contains: search, mode: "insensitive" } },
            { orgNumber: { contains: search } },
          ],
        }),
      },
      orderBy: { name: "asc" },
      take:    100,
    })

    return Response.json({ suppliers })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.MANAGE_SUPPLIERS)

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 })
    }

    const { address, ...rest } = parsed.data
    const supplier = await prisma.supplier.create({
      data: {
        organizationId: ctx.organizationId,
        ...rest,
        address: address === null ? Prisma.DbNull : (address as Prisma.InputJsonValue),
      },
    })

    return Response.json({ supplier }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },   { status: 403 })
  }
  console.error("[suppliers]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
