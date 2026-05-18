import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { requireFeature } from "@/lib/plans/guard"
import { buildAccountingContext } from "@/lib/ai/accounting-context"
import { buildExplainPrompt } from "@/lib/ai/prompts"
import { callStructured } from "@/lib/ai/gateway"
import type { ExplainResult } from "@/lib/ai/types"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    await requireFeature(ctx.organizationId, "ai_assistant")

    const { question, accountNumber } = await req.json() as {
      question:       string
      accountNumber?: string
    }

    if (!question?.trim()) {
      return Response.json({ error: "Fråga krävs" }, { status: 400 })
    }

    const aiCtx       = await buildAccountingContext(ctx.organizationId)
    const systemPrompt = buildExplainPrompt(aiCtx, question, accountNumber)

    const result = await callStructured<ExplainResult>({
      organizationId: ctx.organizationId,
      userId:         ctx.userId,
      feature:        "explain",
      systemPrompt,
      userMessage:    question,
      maxTokens:      1024,
    })

    return Response.json(result.data)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[ai/explain]", err)
    return Response.json({ error: "Förklaringen misslyckades" }, { status: 500 })
  }
}
