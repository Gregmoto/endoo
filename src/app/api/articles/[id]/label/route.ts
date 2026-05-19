import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")
    const { id } = await params

    const article = await prisma.product.findFirst({
      where:  { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { sku: true, name: true, ean: true, unitPrice: true, currency: true },
    })
    if (!article) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    const url    = new URL(req.url)
    const format = (url.searchParams.get("format") ?? "code128") as "code128" | "ean13"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bwipjs = await import("bwip-js/node") as any
    const code   = format === "ean13" && article.ean ? article.ean : (article.sku ?? id)
    const bcType = format === "ean13" && article.ean ? "ean13" : "code128"

    const png = await bwipjs.toBuffer({
      bcid:        bcType,
      text:        code,
      scale:       3,
      height:      10,
      includetext: true,
      textxalign:  "center",
    })

    return new Response(png, {
      headers: {
        "Content-Type":        "image/png",
        "Content-Disposition": `inline; filename="${article.sku ?? id}.png"`,
        "Cache-Control":       "public, max-age=3600",
      },
    })
  } catch (err) {
    return handleApiError(err, "articles/[id]/label")
  }
}
