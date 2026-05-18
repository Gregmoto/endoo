/**
 * POST /api/accounting/sie/import/[importJobId]/execute
 *
 * Executes the SIE import. Runs synchronously (SIE files are small).
 * Idempotent — returns 409 if already completed.
 *
 * Body: optional ImportSieOptions overrides (same shape as /preview body)
 */

import { NextRequest }       from "next/server"
import { requireAuth }       from "@/lib/rbac/guards"
import { canOrThrow }        from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }            from "@/lib/prisma"
import { executeSieImport }  from "@/lib/accounting/sie/importer"
import type { ImportSieOptions } from "@/lib/accounting/sie/importer"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ importJobId: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.IMPORT_SIE)

    const { importJobId } = await params

    const job = await prisma.sieImportJob.findFirst({
      where:  { id: importJobId, organizationId: ctx.organizationId },
      select: { rawContent: true, charset: true, importOptions: true, status: true },
    })
    if (!job) {
      return Response.json({ error: "Importjobb hittades inte" }, { status: 404 })
    }
    if (job.status === "completed") {
      const result = await prisma.sieImportJob.findUnique({
        where:  { id: importJobId },
        select: { importResult: true },
      })
      return Response.json({ alreadyCompleted: true, result: result?.importResult }, { status: 409 })
    }
    if (job.status === "importing") {
      return Response.json({ error: "Import pågår redan" }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    const savedOpts = (job.importOptions ?? {}) as Partial<ImportSieOptions>
    const opts: ImportSieOptions = {
      dryRun:                 false,
      accountMapping:         body.accountMapping         ?? savedOpts.accountMapping         ?? {},
      defaultJournalSeries:   body.defaultJournalSeries   ?? savedOpts.defaultJournalSeries   ?? "A",
      skipExistingVerNumbers: body.skipExistingVerNumbers ?? savedOpts.skipExistingVerNumbers ?? true,
      createMissingAccounts:  body.createMissingAccounts  ?? savedOpts.createMissingAccounts  ?? true,
    }

    // Mark as importing
    await prisma.sieImportJob.update({
      where: { id: importJobId },
      data:  { status: "importing", startedAt: new Date(), importOptions: opts as object },
    })

    try {
      const importResult = await executeSieImport(
        ctx.organizationId,
        job.rawContent,
        job.charset,
        opts,
        ctx.userId,
      )

      await prisma.sieImportJob.update({
        where: { id: importJobId },
        data:  {
          status:       "completed",
          completedAt:  new Date(),
          importResult: importResult as object,
          errorMessage: importResult.errors.length > 0 ? importResult.errors[0] : null,
        },
      })

      return Response.json({ ok: true, result: importResult })
    } catch (execErr) {
      const msg = execErr instanceof Error ? execErr.message : String(execErr)
      await prisma.sieImportJob.update({
        where: { id: importJobId },
        data:  { status: "failed", errorMessage: msg },
      })
      throw execErr
    }
  } catch (err) {
    return handleError("[POST /api/accounting/sie/import/execute]", err)
  }
}

function handleError(ctx: string, err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error(ctx, err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
