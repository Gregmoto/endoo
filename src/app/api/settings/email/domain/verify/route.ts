import { prisma }         from "@/lib/prisma"
import { requireAuth }    from "@/lib/rbac/guards"
import { canOrThrow }     from "@/lib/rbac/policy"
import { resend }         from "@/lib/email/client"
import { handleApiError } from "@/lib/api/handle-error"

export async function POST(): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const domainVerification = await prisma.emailDomainVerification.findFirst({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
    })

    if (!domainVerification) {
      return Response.json({ error: "Ingen domän att verifiera" }, { status: 404 })
    }

    if (!domainVerification.resendDomainId) {
      return Response.json({ error: "Domän saknar Resend-ID" }, { status: 400 })
    }

    if (!resend) {
      return Response.json({ error: "Resend inte konfigurerat" }, { status: 503 })
    }

    const res = await resend.domains.verify(domainVerification.resendDomainId)
    if (res.error) {
      return Response.json({ error: res.error.message }, { status: 502 })
    }

    const now = new Date()
    const updated = await prisma.emailDomainVerification.update({
      where: { id: domainVerification.id },
      data: {
        status:     "verified",
        verifiedAt: now,
      },
    })

    return Response.json({ verification: updated })
  } catch (err) {
    return handleApiError(err, "settings/email/domain/verify POST")
  }
}
