/**
 * POST /api/accounting/sie/import
 *
 * Upload a SIE file (multipart, field: "file") and optional charset query param.
 * Parses the file, runs a dry-run preview, stores the job and returns preview data.
 *
 * Returns: { importJobId, preview: ImportSiePreview }
 */

import { NextRequest }       from "next/server"
import { requireAuth }       from "@/lib/rbac/guards"
import { canOrThrow }        from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { requireFeature }    from "@/lib/plans/guard"
import { prisma }            from "@/lib/prisma"
import { createHash }        from "crypto"
import { parseSie, decodeBuffer } from "@/lib/accounting/sie/parser"
import { previewSieImport }  from "@/lib/accounting/sie/importer"

const DEFAULT_OPTS = {
  accountMapping:         {} as Record<string, string>,
  defaultJournalSeries:   "A",
  skipExistingVerNumbers: true,
  createMissingAccounts:  true,
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.IMPORT_SIE)
    await requireFeature(ctx.organizationId, "data_import")

    const form    = await req.formData()
    const file    = form.get("file")
    const charset = (form.get("charset") as string | null) ?? "CP437"

    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: "Fil saknas (fält: file)" }, { status: 400 })
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const filename = (file as File).name ?? "import.si"
    const fileHash = createHash("sha256").update(buffer).digest("hex")
    const b64      = buffer.toString("base64")

    // Check for duplicate
    const existing = await prisma.sieImportJob.findUnique({
      where: { organizationId_fileHash: { organizationId: ctx.organizationId, fileHash } },
      select: { id: true, status: true, previewData: true },
    })
    if (existing) {
      return Response.json({
        importJobId: existing.id,
        preview:     existing.previewData,
        duplicate:   true,
      })
    }

    // Parse
    const textContent = decodeBuffer(buffer, charset)
    const parsed      = parseSie(textContent)

    if (parsed.errors.length > 0 && parsed.journals.length === 0 && parsed.accounts.length === 0) {
      return Response.json({
        error:       "Kunde inte tolka SIE-filen",
        parseErrors: parsed.errors,
      }, { status: 422 })
    }

    // Run preview
    const preview = await previewSieImport(ctx.organizationId, parsed, DEFAULT_OPTS)

    // Save job
    const job = await prisma.sieImportJob.create({
      data: {
        organizationId:   ctx.organizationId,
        importedByUserId: ctx.userId,
        fileName:         filename,
        fileSize:         buffer.byteLength,
        fileHash,
        charset,
        sieType:          parsed.sieType ?? undefined,
        rawContent:       b64,
        status:           "previewed",
        previewData:      preview as object,
        importOptions:    DEFAULT_OPTS as object,
      },
      select: { id: true },
    })

    // Audit log
    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "sie_import_preview",
        entityType:     "SieImportJob",
        entityId:       job.id,
        meta: {
          fileName:   filename,
          sieType:    parsed.sieType,
          journals:   parsed.journals.length,
          accounts:   parsed.accounts.length,
        },
      },
    }).catch(() => {})

    return Response.json({ importJobId: job.id, preview })
  } catch (err) {
    return handleError("[POST /api/accounting/sie/import]", err)
  }
}

function handleError(ctx: string, err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error(ctx, err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
