/**
 * GET  /api/platform/organizations — list all orgs (super admin only)
 * POST /api/platform/organizations — not used (orgs created via register)
 */

import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/rbac/guards"

export async function GET(req: Request) {
  try {
    await requireSuperAdmin()
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const type   = searchParams.get("type") ?? ""
  const status = searchParams.get("status") ?? ""
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit  = 50

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ]
  }
  if (type === "agency" || type === "customer") where.type = type
  if (status === "active")   where.isActive = true
  if (status === "inactive") where.isActive = false
  if (status === "deleted")  where.deletedAt = { not: null }

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            members: true,
            invoices: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ])

  return Response.json({ orgs, total, pages: Math.ceil(total / limit) })
}
