import { prisma }         from "@/lib/prisma"
import { requireAuth }    from "@/lib/rbac/guards"
import { canOrThrow }     from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"

export async function POST(req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const body  = await req.json()
    const email = body?.email as string | undefined
    if (!email || typeof email !== "string") {
      return Response.json({ error: "Fält 'email' krävs" }, { status: 400 })
    }

    await prisma.emailSuppression.deleteMany({
      where: {
        organizationId: ctx.organizationId,
        email,
      },
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err, "email/suppression/remove")
  }
}
