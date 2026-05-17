/**
 * POST /api/accounting/journals/[id]/void
 * Voids a posted journal by creating a reversing journal in the current open period.
 */

import { prisma }       from "@/lib/prisma"
import { requireAuth }  from "@/lib/rbac/guards"
import { canOrThrow }   from "@/lib/rbac/policy"
import { voidJournal }  from "@/services/accounting/void-journal"
import {
  JournalNotFoundError,
  JournalNotPostedError,
  JournalAlreadyVoidedError,
  PeriodLockedError,
  PeriodClosedError,
} from "@/lib/accounting/posting/errors"
import { FiscalYearNotFoundError } from "@/lib/accounting/journals"
import { z } from "zod"

const Schema = z.object({
  reason: z.string().min(5, "Ange en anledning (minst 5 tecken)").max(500),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "accounting:manage_periods")
    const { id } = await params

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ange en anledning", details: parsed.error.flatten() }, { status: 400 })
    }

    // Verify journal belongs to org
    const journal = await prisma.journal.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!journal) return Response.json({ error: "Verifikation hittades ej" }, { status: 404 })

    const result = await voidJournal(ctx.organizationId, id, ctx.userId, parsed.data.reason)
    return Response.json({
      original: result.original,
      reversal: result.reversal,
    }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if (err instanceof JournalNotFoundError)
    return Response.json({ error: "Verifikation hittades ej" }, { status: 404 })
  if (err instanceof JournalAlreadyVoidedError)
    return Response.json({ error: "Verifikationen är redan makulerad" }, { status: 422 })
  if (err instanceof JournalNotPostedError)
    return Response.json({ error: "Endast bokförda verifikationer kan makuleras" }, { status: 422 })
  if (err instanceof PeriodLockedError)
    return Response.json({ error: "Aktuell period är låst — lås upp perioden innan makulering" }, { status: 422 })
  if (err instanceof PeriodClosedError)
    return Response.json({ error: "Aktuell period är stängd — kontakta plattformsadmin" }, { status: 422 })
  if (err instanceof FiscalYearNotFoundError)
    return Response.json({ error: "Inget öppet räkenskapsår hittades för dagens datum" }, { status: 422 })
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[accounting/journals/void]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
