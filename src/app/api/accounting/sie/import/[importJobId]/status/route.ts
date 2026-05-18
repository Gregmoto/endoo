/**
 * GET /api/accounting/sie/import/[importJobId]/status
 *
 * Returns current status and result of a SIE import job.
 */

import { NextRequest }       from "next/server"
import { requireAuth }       from "@/lib/rbac/guards"
import { canOrThrow }        from "@/lib/rbac/policy"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }            from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ importJobId: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCOUNTING_PERMISSIONS.IMPORT_SIE)

    const { importJobId } = await params

    const job = await prisma.sieImportJob.findFirst({
      where: { id: importJobId, organizationId: ctx.organizationId },
      select: {
        id: true, status: true, fileName: true, fileSize: true,
        sieType: true, charset: true,
        previewData: true, importOptions: true, importResult: true,
        errorMessage: true, startedAt: true, completedAt: true, createdAt: true,
      },
    })
    if (!job) {
      return Response.json({ error: "Importjobb hittades inte" }, { status: 404 })
    }

    return Response.json({ job })
  } catch (err) {
    return handleError("[GET /api/accounting/sie/import/status]", err)
  }
}

function handleError(ctx: string, err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error(ctx, err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
