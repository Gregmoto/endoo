import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { requireFeature } from "@/lib/plans/guard"
import { buildAccountingContext } from "@/lib/ai/accounting-context"
import { buildAccountSuggestPrompt } from "@/lib/ai/prompts"
import { callStructured } from "@/lib/ai/gateway"
import type { AccountSuggestResult } from "@/lib/ai/types"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    await requireFeature(ctx.organizationId, "ai_assistant")
    const { description, amountOre } = await req.json() as {
      description: string
      amountOre?:  number
    }

    if (!description?.trim()) {
      return Response.json({ error: "Beskrivning krävs" }, { status: 400 })
    }

    const aiCtx       = await buildAccountingContext(ctx.organizationId)
    const systemPrompt = buildAccountSuggestPrompt(aiCtx, description, amountOre)

    const result = await callStructured<AccountSuggestResult>({
      organizationId: ctx.organizationId,
      userId:         ctx.userId,
      feature:        "account_suggest",
      systemPrompt,
      userMessage:    `Föreslå konton för: "${description}"`,
      maxTokens:      512,
    })

    return Response.json(result.data)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[ai/suggest-account]", err)
    return Response.json({ error: "Kontoförslag misslyckades" }, { status: 500 })
  }
}
