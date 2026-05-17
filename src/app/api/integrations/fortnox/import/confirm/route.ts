/**
 * POST /api/integrations/fortnox/import/confirm
 *
 * Commits a previewed SIE4 import.
 * The client must supply the same file again + the fileHash from the preview step.
 * ImportFile.fileHash UNIQUE prevents double-importing the same file.
 */

import { requireAuth }            from "@/lib/rbac/guards"
import { canOrThrow }             from "@/lib/rbac/policy"
import { prisma }                 from "@/lib/prisma"
import { fortnoxImportConnector } from "@/lib/integrations/connectors/fortnox-import"
import { createHash }             from "crypto"

/** Returns the virtual file-import Connection for this org, creating it if needed. */
async function getOrCreateFileImportConnection(organizationId: string): Promise<string> {
  const existing = await prisma.connection.findFirst({
    where:  { organizationId, integrationSlug: "fortnox_import" },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.connection.create({
    data: {
      organizationId,
      integrationSlug: "fortnox_import",
      status:          "active",
    },
  })
  return created.id
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "accounting:post")

    const form     = await req.formData()
    const file     = form.get("file")
    const fileHash = form.get("fileHash") as string | null

    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: "Fil saknas (fält: file)" }, { status: 400 })
    }
    if (!fileHash) {
      return Response.json({ error: "fileHash krävs" }, { status: 400 })
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const filename = (file as File).name ?? "sie4.si"

    // Verify hash matches what user previewed
    const actualHash = createHash("sha256").update(buffer).digest("hex")
    if (actualHash !== fileHash) {
      return Response.json({ error: "Filen matchar inte förhandsgranskningen" }, { status: 422 })
    }

    // Check for duplicate import
    const existing = await prisma.importFile.findUnique({
      where: { organizationId_fileHash: { organizationId: ctx.organizationId, fileHash } },
    })
    if (existing) {
      return Response.json({
        error:       "Den här filen har redan importerats",
        committedAt: existing.committedAt,
      }, { status: 409 })
    }

    const connectionId = await getOrCreateFileImportConnection(ctx.organizationId)

    // Record the import file first (prevents race conditions)
    await prisma.importFile.create({
      data: {
        organizationId:   ctx.organizationId,
        connectionId,
        importedByUserId: ctx.userId,
        fileName:         filename,
        fileSize:         buffer.byteLength,
        fileHash,
        integrationSlug:  "fortnox_import",
        status:           "preview",
      },
    })

    try {
      const result = await fortnoxImportConnector.commitImport!(
        buffer,
        filename,
        ctx.organizationId,
        ctx.userId,
        fileHash,
      )

      // Mark as committed
      await prisma.importFile.update({
        where: { organizationId_fileHash: { organizationId: ctx.organizationId, fileHash } },
        data:  {
          status:       "committed",
          committedAt:  new Date(),
          importResult: { journalsCreated: result.journalsCreated },
        },
      })

      return Response.json({ ok: true, journalsCreated: result.journalsCreated })
    } catch (commitErr) {
      await prisma.importFile.update({
        where: { organizationId_fileHash: { organizationId: ctx.organizationId, fileHash } },
        data:  {
          status:       "failed",
          errorMessage: commitErr instanceof Error ? commitErr.message : String(commitErr),
        },
      })
      throw commitErr
    }
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[fortnox/import/confirm]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
