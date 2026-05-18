/**
 * POST /api/accounting/sie/import/[importJobId]/preview
 *
 * Re-runs dry-run with updated options (account mappings, series, etc.).
 * Does NOT change DB state beyond updating previewData + importOptions.
 *
 * Body: Partial<ImportSieOptions> (without dryRun — always dry)
 */

import { NextRequest }       from "next/server"
import { requireAuth }       from "@/lib/rbac/guards"
import { canOrThrow }        from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }            from "@/lib/prisma"
import { parseSie, decodeBuffer } from "@/lib/accounting/sie/parser"
import { previewSieImport }  from "@/lib/accounting/sie/importer"
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
    if (job.status === "importing" || job.status === "completed") {
      return Response.json({ error: "Importen har redan körts" }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    const savedOpts = (job.importOptions ?? {}) as Partial<ImportSieOptions>
    const opts = {
      accountMapping:         body.accountMapping         ?? savedOpts.accountMapping         ?? {},
      defaultJournalSeries:   body.defaultJournalSeries   ?? savedOpts.defaultJournalSeries   ?? "A",
      skipExistingVerNumbers: body.skipExistingVerNumbers ?? savedOpts.skipExistingVerNumbers ?? true,
      createMissingAccounts:  body.createMissingAccounts  ?? savedOpts.createMissingAccounts  ?? true,
    }

    const buf    = Buffer.from(job.rawContent, "base64")
    const text   = decodeBuffer(buf, job.charset)
    const parsed = parseSie(text)
    const preview = await previewSieImport(ctx.organizationId, parsed, opts)

    await prisma.sieImportJob.update({
      where: { id: importJobId },
      data:  { previewData: preview as object, importOptions: opts as object },
    })

    return Response.json({ preview })
  } catch (err) {
    return handleError("[POST /api/accounting/sie/import/preview]", err)
  }
}

function handleError(ctx: string, err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error(ctx, err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
