import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma, ProductType } from "@prisma/client"
import { z } from "zod"

type Tab = "all" | "stock" | "service" | "phasing" | "inactive"

function tabWhere(tab: Tab, base: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  switch (tab) {
    case "stock":    return { ...base, isStockItem: true, type: "product", isActive: true }
    case "service":  return { ...base, type: "service", isActive: true }
    case "phasing":  return { ...base, isPhasingOut: true, isActive: true }
    case "inactive": return { ...base, isActive: false }
    default:         return base
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")

    const url          = new URL(req.url)
    const search       = url.searchParams.get("search")       ?? ""
    const tab          = (url.searchParams.get("tab")         ?? "all") as Tab
    const manufacturer = url.searchParams.get("manufacturer") ?? ""
    const account      = url.searchParams.get("account")      ?? ""
    const page         = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"))
    const limit        = Math.min(250, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25")))
    const sort         = url.searchParams.get("sort")  ?? "name"
    const order        = (url.searchParams.get("order") ?? "asc") as "asc" | "desc"

    const validSorts: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      name:           { name: order },
      sku:            { sku: order },
      unitPrice:      { unitPrice: order },
      stockQuantity:  { stockQuantity: order },
      inventoryValue: { inventoryValue: order },
    }
    const orderBy = validSorts[sort] ?? { name: order }

    const baseWhere: Prisma.ProductWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(manufacturer ? { manufacturer: { contains: manufacturer, mode: "insensitive" } } : {}),
      ...(account ? { salesAccount: account } : {}),
      ...(search ? {
        OR: [
          { name:        { contains: search, mode: "insensitive" } },
          { sku:         { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { ean:         { contains: search, mode: "insensitive" } },
          { manufacturer: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    }

    const where = tabWhere(tab, baseWhere)

    const [articles, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true, sku: true, name: true, description: true,
          type: true, isActive: true, isStockItem: true, isPhasingOut: true,
          unitPrice: true, currency: true, averageCost: true,
          stockQuantity: true, reservedQuantity: true, availableQuantity: true,
          inventoryValue: true, vatType: true, salesAccount: true,
          manufacturer: true, ean: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ])

    const [allCount, stockCount, serviceCount, phasingCount, inactiveCount, manufacturerRows] = await Promise.all([
      prisma.product.count({ where: tabWhere("all",      baseWhere) }),
      prisma.product.count({ where: tabWhere("stock",    baseWhere) }),
      prisma.product.count({ where: tabWhere("service",  baseWhere) }),
      prisma.product.count({ where: tabWhere("phasing",  baseWhere) }),
      prisma.product.count({ where: tabWhere("inactive", baseWhere) }),
      prisma.product.findMany({
        where: { organizationId: ctx.organizationId, deletedAt: null, manufacturer: { not: null } },
        select: { manufacturer: true },
        distinct: ["manufacturer"],
        orderBy: { manufacturer: "asc" },
      }),
    ])

    const manufacturers = manufacturerRows.map(r => r.manufacturer).filter(Boolean) as string[]

    return Response.json({
      articles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      tabs: { all: allCount, stock: stockCount, service: serviceCount, phasing: phasingCount, inactive: inactiveCount },
      manufacturers,
    })
  } catch (err) {
    return handleApiError(err, "articles")
  }
}

const CreateSchema = z.object({
  name:                   z.string().min(1).max(255),
  sku:                    z.string().max(50).optional().nullable(),
  description:            z.string().max(2000).optional().nullable(),
  type:                   z.enum(["product", "service"]).default("product"),
  isActive:               z.boolean().default(true),
  isStockItem:            z.boolean().default(true),
  isPhasingOut:           z.boolean().default(false),
  unitPrice:              z.number().int().min(0).default(0),
  currency:               z.string().max(3).default("SEK"),
  vatType:                z.string().max(50).optional().nullable(),
  salesAccount:           z.string().max(20).optional().nullable(),
  purchaseAccount:        z.string().max(20).optional().nullable(),
  purchasePrice:          z.number().int().min(0).optional().nullable(),
  ean:                    z.string().max(20).optional().nullable(),
  manufacturer:           z.string().max(100).optional().nullable(),
  manufacturerSku:        z.string().max(100).optional().nullable(),
  notes:                  z.string().max(5000).optional().nullable(),
  warehouseLocation:      z.string().max(100).optional().nullable(),
  width:                  z.number().int().optional().nullable(),
  height:                 z.number().int().optional().nullable(),
  depth:                  z.number().int().optional().nullable(),
  weightGrams:            z.number().int().optional().nullable(),
  inventoryAccount:       z.string().max(20).optional().nullable(),
  inventoryChangeAccount: z.string().max(20).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:create")

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    let sku = data.sku ?? null
    if (sku) {
      const existing = await prisma.product.findUnique({
        where: { organizationId_sku: { organizationId: ctx.organizationId, sku } },
      })
      if (existing) {
        return Response.json({ error: "Artikelnummer används redan" }, { status: 409 })
      }
    } else {
      let generatedSku: string | null = null
      try {
        const { generateArticleNumber } = await import("@/lib/articles/article-number")
        generatedSku = await generateArticleNumber(ctx.organizationId)
      } catch {
        const count = await prisma.product.count({ where: { organizationId: ctx.organizationId } })
        generatedSku = `A-${String(count + 1).padStart(4, "0")}`
      }
      sku = generatedSku
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          organizationId:         ctx.organizationId,
          name:                   data.name,
          sku,
          description:            data.description,
          type:                   data.type as ProductType,
          isActive:               data.isActive,
          isStockItem:            data.isStockItem,
          isPhasingOut:           data.isPhasingOut,
          unitPrice:              BigInt(data.unitPrice),
          currency:               data.currency,
          vatType:                data.vatType,
          salesAccount:           data.salesAccount,
          purchaseAccount:        data.purchaseAccount,
          purchasePrice:          data.purchasePrice != null ? BigInt(data.purchasePrice) : null,
          ean:                    data.ean,
          manufacturer:           data.manufacturer,
          manufacturerSku:        data.manufacturerSku,
          notes:                  data.notes,
          warehouseLocation:      data.warehouseLocation,
          width:                  data.width,
          height:                 data.height,
          depth:                  data.depth,
          weightGrams:            data.weightGrams,
          inventoryAccount:       data.inventoryAccount,
          inventoryChangeAccount: data.inventoryChangeAccount,
        },
      })

      if (p.isStockItem && p.type === "product") {
        await tx.inventoryItem.create({
          data: {
            organizationId: ctx.organizationId,
            productId:      p.id,
            unitOfMeasure:  "st",
            costMethod:     "average",
          },
        })
      }

      return p
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

    return Response.json(product, { status: 201 })
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return Response.json({ error: "Artikelnummer används redan" }, { status: 409 })
    }
    return handleApiError(err, "articles")
  }
}
