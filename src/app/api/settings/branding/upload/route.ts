/**
 * POST /api/settings/branding/upload
 *
 * Uploads a branding asset (logo, favicon) to Vercel Blob.
 * Returns the public URL to store in BrandingProfile.
 * Requires branding:upload_assets permission.
 *
 * Body: multipart/form-data with fields:
 *   file  — image file (PNG / SVG / WEBP, max 2 MB)
 *   field — "logoUrl" | "logoDarkUrl" | "faviconUrl" | "emailLogoUrl" | "pdfLogoUrl"
 */

import { put }         from "@vercel/blob"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"

const ALLOWED_FIELDS = new Set(["logoUrl", "logoDarkUrl", "faviconUrl", "emailLogoUrl", "pdfLogoUrl"])
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = new Set(["image/png", "image/svg+xml", "image/webp", "image/jpeg"])

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "branding:upload_assets")

    const form = await req.formData()
    const file  = form.get("file") as File | null
    const field = form.get("field") as string | null

    if (!file || !field)                  return Response.json({ error: "Saknar fil eller fält" }, { status: 400 })
    if (!ALLOWED_FIELDS.has(field))       return Response.json({ error: "Ogiltigt fältnamn" },    { status: 400 })
    if (!ALLOWED_TYPES.has(file.type))    return Response.json({ error: "Filtypen stöds ej" },    { status: 400 })
    if (file.size > MAX_BYTES)            return Response.json({ error: "Filen är för stor (max 2 MB)" }, { status: 400 })

    const ext  = file.name.split(".").pop() ?? "png"
    const path = `branding/${ctx.organizationId}/${field}.${ext}`

    const blob = await put(path, file, { access: "public", addRandomSuffix: false })

    return Response.json({ url: blob.url, field })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[settings/branding/upload]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
