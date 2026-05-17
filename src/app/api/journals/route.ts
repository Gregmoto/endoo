import { NextRequest, NextResponse } from "next/server"
import { requireAuth }               from "@/lib/rbac/guards"
import { canOrThrow }                from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS }    from "@/lib/rbac/permissions"
import { prisma }                    from "@/lib/prisma"
import { createJournal, postJournal, CreateJournalSchema } from "@/lib/accounting/journals"

function ser(v: unknown) {
  return JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)))
}

// GET /api/journals — list journals with filters
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.READ)

    const { searchParams } = new URL(req.url)
    const status     = searchParams.get("status") ?? undefined
    const search     = searchParams.get("search") ?? ""
    const fiscalYear = searchParams.get("fiscalYearId") ?? undefined
    const page       = Math.max(1, Number(searchParams.get("page") ?? "1"))
    const limit      = 50
    const skip       = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: ctx.organizationId,
      ...(status      ? { status }                   : {}),
      ...(fiscalYear  ? { fiscalYearId: fiscalYear } : {}),
      ...(search      ? {
        OR: [
          { reference:   { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    }

    const [total, journals] = await Promise.all([
      prisma.journal.count({ where }),
      prisma.journal.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id:          true,
          reference:   true,
          date:        true,
          description: true,
          status:      true,
          sourceType:  true,
          postedAt:    true,
          createdAt:   true,
          fiscalYear:  { select: { name: true } },
          series:      { select: { prefix: true, name: true } },
          entries: {
            select: {
              debit:   true,
              credit:  true,
              account: { select: { number: true, name: true } },
            },
          },
        },
      }),
    ])

    return NextResponse.json({ journals: ser(journals), total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return NextResponse.json({ error: "Forbidden" },    { status: 403 })
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST /api/journals — create + optionally post a manual journal
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.POST)

    const body   = await req.json()
    const parsed = CreateJournalSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const journal = await createJournal(parsed.data)

    // Auto-post if requested
    if (body.post === true) {
      const posted = await postJournal(ctx.organizationId, journal.id, ctx.userId)
      return NextResponse.json(ser(posted), { status: 201 })
    }

    return NextResponse.json(ser(journal), { status: 201 })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return NextResponse.json({ error: "Forbidden" },    { status: 403 })
    const msg = (err as Error).message
    return NextResponse.json({ error: msg ?? "Server error" }, { status: 500 })
  }
}
