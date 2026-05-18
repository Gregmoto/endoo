/**
 * GET  /api/products  — list products (search, type, isActive, category)
 * POST /api/products  — create product
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { getOrgPlan, enforceLimit } from "@/lib/plans/guard"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma, ProductType } from "@prisma/client"
import { z } from "zod"
import { indexProduct } from "@/lib/search/index-entity"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")

    const url      = new URL(req.url)
    const search   = url.searchParams.get("search")   ?? ""
    const type     = url.searchParams.get("type")     ?? ""
    const category = url.searchParams.get("category") ?? ""
    const active   = url.searchParams.get("active")   // "true" | "false" | ""
    const page     = parseInt(url.searchParams.get("page") ?? "1")
    const limit    = 50

    const where: Prisma.ProductWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(type     ? { type: type as ProductType }     : {}),
      ...(category ? { category } : {}),
      ...(active !== null && active !== "" ? { isActive: active === "true" } : {}),
      ...(search   ? {
        OR: [
          { name:        { contains: search, mode: "insensitive" } },
          { sku:         { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.product.count({ where }),
    ])

    return Response.json({ products, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    return handleError(err)
  }
}

const CreateSchema = z.object({
  name:        z.string().min(1).max(255),
  type:        z.enum(["product", "service"]).default("service"),
  isActive:    z.boolean().default(true),
  sku:         z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  unitPrice:   z.number().int().min(0),  // öre (minor units)
  taxRate:     z.number().min(0).max(1).default(0.25),  // 0.25 = 25%
  unit:        z.string().max(30).default("st"),
  category:    z.string().max(100).optional().nullable(),
  currency:    z.string().max(3).default("SEK"),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:create")

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    // Plan limit: max products
    const plan = await getOrgPlan(ctx.organizationId)
    const productCount = await prisma.product.count({ where: { organizationId: ctx.organizationId, deletedAt: null } })
    enforceLimit(plan, "maxProducts", productCount)

    // Auto-generate SKU if not provided
    let sku = parsed.data.sku
    if (!sku) {
      const count = await prisma.product.count({ where: { organizationId: ctx.organizationId } })
      sku = `P-${String(count + 1).padStart(4, "0")}`
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        organizationId: ctx.organizationId,
        sku,
        unitPrice: BigInt(parsed.data.unitPrice),
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "Product",
        entityId:       product.id,
        after:          { name: product.name, sku: product.sku, unitPrice: product.unitPrice.toString() },
      },
    }).catch(() => {})

    indexProduct(ctx.organizationId, product)

    return Response.json(product, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { code?: string }).code === "P2002") {
    return Response.json({ error: "Artikelnumret används redan av en annan artikel" }, { status: 409 })
  }
  return handleApiError(err, "products")
}
