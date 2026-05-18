import { prisma }         from "@/lib/prisma"
import { requireAuth }    from "@/lib/rbac/guards"
import { canOrThrow }     from "@/lib/rbac/policy"
import { resend }         from "@/lib/email/client"
import { handleApiError } from "@/lib/api/handle-error"

export async function GET(): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:read")

    const verification = await prisma.emailDomainVerification.findFirst({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({ verification: verification ?? null })
  } catch (err) {
    return handleApiError(err, "settings/email/domain GET")
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const body = await req.json()
    const domain = body?.domain as string | undefined
    if (!domain || typeof domain !== "string") {
      return Response.json({ error: "Fält 'domain' krävs" }, { status: 400 })
    }

    if (!resend) {
      return Response.json({ error: "Resend inte konfigurerat" }, { status: 503 })
    }

    const res = await resend.domains.create({ name: domain })
    if (res.error) {
      return Response.json({ error: res.error.message }, { status: 502 })
    }

    const dnsRecords = (res.data as unknown as { records?: unknown })?.records ?? []

    const verification = await prisma.emailDomainVerification.create({
      data: {
        organizationId: ctx.organizationId,
        domain,
        resendDomainId: res.data?.id ?? null,
        status:         "pending",
        dnsRecords:     dnsRecords as never,
      },
    })

    return Response.json({ verification })
  } catch (err) {
    return handleApiError(err, "settings/email/domain POST")
  }
}
