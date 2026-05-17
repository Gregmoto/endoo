import { NextRequest, NextResponse } from "next/server"
import { requireAuth }               from "@/lib/rbac/guards"
import { canOrThrow }                from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS }    from "@/lib/rbac/permissions"
import { prisma }                    from "@/lib/prisma"
import { postJournal, voidJournal }  from "@/lib/accounting/journals"

function ser(v: unknown) {
  return JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)))
}

// GET /api/journals/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.READ)
    const { id } = await params

    const journal = await prisma.journal.findFirst({
      where:  { id, organizationId: ctx.organizationId },
      include: {
        fiscalYear: { select: { name: true } },
        series:     { select: { prefix: true, name: true } },
        entries: {
          include: { account: { select: { number: true, name: true, type: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!journal) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(ser(journal))
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// PATCH /api/journals/[id] — post or void
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.POST)
    const { id } = await params
    const body   = await req.json()

    if (body.action === "post") {
      const j = await postJournal(ctx.organizationId, id, ctx.userId)
      return NextResponse.json(ser(j))
    }
    if (body.action === "void") {
      const j = await voidJournal(ctx.organizationId, id, ctx.userId, body.reason ?? "Manuell återföring")
      return NextResponse.json(ser(j))
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return NextResponse.json({ error: "Forbidden" },    { status: 403 })
    return NextResponse.json({ error: (err as Error).message ?? "Server error" }, { status: 500 })
  }
}
