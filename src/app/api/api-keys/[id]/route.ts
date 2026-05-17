import { NextRequest, NextResponse } from "next/server"
import { requireAuth }               from "@/lib/rbac/guards"
import { prisma }                    from "@/lib/prisma"

// DELETE /api/api-keys/[id] — revoke key
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    const { id } = await params

    const apiKey = await prisma.apiKey.findFirst({
      where:  { id, organizationId: ctx.organizationId },
      select: { id: true, revokedAt: true },
    })

    if (!apiKey) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (apiKey.revokedAt) return NextResponse.json({ error: "Already revoked" }, { status: 409 })

    await prisma.apiKey.update({
      where: { id },
      data: {
        isActive:        false,
        revokedAt:       new Date(),
        revokedByUserId: ctx.userId,
      },
    })

    return NextResponse.json({ revoked: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
