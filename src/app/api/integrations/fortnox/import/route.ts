/**
 * POST /api/integrations/fortnox/import
 *
 * Upload a SIE4 file and receive a preview (dry-run).
 * Expects multipart/form-data with field "file".
 *
 * Returns ImportPreview — the client shows this to the user before confirming.
 */

import { requireAuth }          from "@/lib/rbac/guards"
import { canOrThrow }           from "@/lib/rbac/policy"
import { fortnoxImportConnector } from "@/lib/integrations/connectors/fortnox-import"
import { createHash }           from "crypto"

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "accounting:post")

    const form = await req.formData()
    const file = form.get("file")

    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: "Fil saknas (fält: file)" }, { status: 400 })
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const filename = (file as File).name ?? "sie4.si"
    const fileHash = createHash("sha256").update(buffer).digest("hex")

    const preview = await fortnoxImportConnector.parseImportFile!(buffer, filename)

    return Response.json({ preview, fileHash, filename })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[fortnox/import]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
