import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"

type ReviewAction = "accepted" | "modified" | "rejected"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    const { id } = await params

    const body = await req.json() as {
      action:           ReviewAction
      modifiedFields?:  Record<string, unknown>   // fields user changed
      rejectionReason?: string
    }

    if (!["accepted", "modified", "rejected"].includes(body.action)) {
      return Response.json({ error: "Ogiltig åtgärd" }, { status: 400 })
    }

    const suggestion = await prisma.aiSuggestion.findUnique({
      where: { id },
    })

    if (!suggestion) {
      return Response.json({ error: "Förslaget hittades ej" }, { status: 404 })
    }

    if (suggestion.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Åtkomst nekad" }, { status: 403 })
    }

    if (suggestion.status !== "pending") {
      return Response.json({ error: "Förslaget är redan granskat" }, { status: 409 })
    }

    const now = new Date()
    if (suggestion.expiresAt < now) {
      await prisma.aiSuggestion.update({
        where: { id },
        data:  { status: "expired" },
      })
      return Response.json({ error: "Förslaget har gått ut" }, { status: 410 })
    }

    const updated = await prisma.aiSuggestion.update({
      where: { id },
      data: {
        status:           body.action,
        reviewedByUserId: ctx.userId,
        reviewedAt:       now,
        modifiedFields:   body.modifiedFields ? (body.modifiedFields as never) : undefined,
        rejectionReason:  body.rejectionReason ?? null,
      },
    })

    return Response.json({
      id:         updated.id,
      status:     updated.status,
      reviewedAt: updated.reviewedAt,
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[ai/suggestions/[id]]", err)
    return Response.json({ error: "Intern serverfel" }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    const { id } = await params

    const suggestion = await prisma.aiSuggestion.findUnique({
      where: { id },
      select: {
        id:                  true,
        organizationId:      true,
        feature:             true,
        sourceType:          true,
        sourceId:            true,
        suggestion:          true,
        confidence:          true,
        confidenceBreakdown: true,
        status:              true,
        modifiedFields:      true,
        rejectionReason:     true,
        reviewedAt:          true,
        createdAt:           true,
        expiresAt:           true,
      },
    })

    if (!suggestion) {
      return Response.json({ error: "Hittades ej" }, { status: 404 })
    }

    if (suggestion.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Åtkomst nekad" }, { status: 403 })
    }

    return Response.json(suggestion)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[ai/suggestions/[id] GET]", err)
    return Response.json({ error: "Intern serverfel" }, { status: 500 })
  }
}
