import { prisma }          from "@/lib/prisma"
import { requireAuth }     from "@/lib/rbac/guards"
import { canOrThrow }      from "@/lib/rbac/policy"
import { sendEmail }       from "@/lib/email/send"
import { handleApiError }  from "@/lib/api/handle-error"

export async function POST(req: Request): Promise<Response> {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "settings:update")

    const body = await req.json()
    const to = body?.to as string | undefined
    if (!to || typeof to !== "string") {
      return Response.json({ error: "Fält 'to' krävs" }, { status: 400 })
    }

    const result = await sendEmail({
      to,
      subject: "Endoo — testutskick",
      html: "<p>Det här är ett testutskick från Endoo. Om du ser detta fungerar e-postkonfigurationen.</p>",
    })

    if (result.error) {
      return Response.json({ error: result.error }, { status: 502 })
    }

    // Fire-and-forget delivery record
    prisma.emailDelivery.create({
      data: {
        organizationId:    ctx.organizationId,
        recipientEmail:    to,
        subject:           "Endoo — testutskick",
        providerMessageId: result.id ?? null,
        status:            "sent",
      },
    }).catch((err) => console.error("[settings/email/test-send] emailDelivery create failed:", err))

    return Response.json({ ok: true, messageId: result.id })
  } catch (err) {
    return handleApiError(err, "settings/email/test-send")
  }
}
